import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getSession, type Session } from "@/lib/auth";

export const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });
export const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function audit(
  actor: string,
  action: string,
  entity: string,
  entityId?: number | null,
  detail?: string | null
) {
  try {
    await db.insert(auditLogs).values({
      actor,
      action,
      entity,
      entityId: entityId ?? null,
      detail: detail ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

type Shape = (body: any) => Record<string, unknown>;

type CollectionOpts = {
  table: any;
  entity: string;
  shape?: Shape;
  orderBy?: any;
  list?: (req: NextRequest, s: Session) => Promise<unknown>;
  create?: (body: any, s: Session) => Promise<unknown>;
};

type ItemOpts = {
  table: any;
  entity: string;
  shape?: Shape;
  get?: (id: number) => Promise<unknown>;
  patch?: (id: number, body: any, s: Session) => Promise<unknown>;
  remove?: (id: number, s: Session) => Promise<unknown>;
};

export function collectionRoutes(opts: CollectionOpts) {
  const { table, entity, shape } = opts;

  async function GET(req: NextRequest) {
    const s = await getSession();
    if (!s) return fail("Unauthorized", 401);
    try {
      if (opts.list) {
        const result = await opts.list(req, s);
        return result instanceof NextResponse ? result : ok(result);
      }
      const rows = await db
        .select()
        .from(table)
        .orderBy(opts.orderBy ?? desc(table.id));
      return ok(rows);
    } catch (e: any) {
      return fail(e?.message || "Failed to load", 500);
    }
  }

  async function POST(req: NextRequest) {
    const s = await getSession();
    if (!s) return fail("Unauthorized", 401);
    try {
      const body = await req.json();
      if (opts.create) {
        const result = await opts.create(body, s);
        return result instanceof NextResponse ? result : ok(result, 201);
      }
      delete body.id;
      delete body.createdAt;
      const values = shape ? shape(body) : body;
      const rows = (await db.insert(table).values(values).returning()) as any[];
      const row = rows[0];
      await audit(s.name, "created", entity, row.id, row.name || row.title || null);
      return ok(row, 201);
    } catch (e: any) {
      return fail(e?.message || "Create failed", 400);
    }
  }

  return { GET, POST };
}

export function itemRoutes(opts: ItemOpts) {
  const { table, entity, shape } = opts;
  const idOf = async (ctx: any) => Number((await ctx.params).id);

  async function GET(_req: NextRequest, ctx: any) {
    const s = await getSession();
    if (!s) return fail("Unauthorized", 401);
    try {
      const id = await idOf(ctx);
      if (opts.get) {
        const result = await opts.get(id);
        return result instanceof NextResponse ? result : ok(result);
      }
      const [row] = await db.select().from(table).where(eq(table.id, id));
      if (!row) return fail("Not found", 404);
      return ok(row);
    } catch (e: any) {
      return fail(e?.message || "Failed to load", 500);
    }
  }

  async function PATCH(req: NextRequest, ctx: any) {
    const s = await getSession();
    if (!s) return fail("Unauthorized", 401);
    try {
      const id = await idOf(ctx);
      const body = await req.json();
      if (opts.patch) {
        const result = await opts.patch(id, body, s);
        return result instanceof NextResponse ? result : ok(result);
      }
      delete body.id;
      delete body.createdAt;
      const rows = (await db
        .update(table)
        .set(shape ? shape(body) : body)
        .where(eq(table.id, id))
        .returning()) as any[];
      const row = rows[0];
      if (!row) return fail("Not found", 404);
      await audit(s.name, "updated", entity, id, row.name || row.title || null);
      return ok(row);
    } catch (e: any) {
      return fail(e?.message || "Update failed", 400);
    }
  }

  async function DELETE(_req: NextRequest, ctx: any) {
    const s = await getSession();
    if (!s) return fail("Unauthorized", 401);
    try {
      const id = await idOf(ctx);
      if (opts.remove) {
        const result = await opts.remove(id, s);
        return result instanceof NextResponse ? result : ok(result);
      }
      const rows = (await db.delete(table).where(eq(table.id, id)).returning()) as any[];
      const row = rows[0];
      if (!row) return fail("Not found", 404);
      await audit(s.name, "deleted", entity, id, row.name || row.title || null);
      return ok({ ok: true });
    } catch (e: any) {
      return fail(e?.message || "Delete failed", 400);
    }
  }

  return { GET, PATCH, DELETE };
}

export const toInt = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

export const str = (v: unknown, fallback: string | null = null) => {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s === "" ? fallback : s;
};
