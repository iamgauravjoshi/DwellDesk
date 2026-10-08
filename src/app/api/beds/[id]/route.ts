import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { beds, tenants } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: any) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const body = await req.json().catch(() => ({}));
  const [bed] = await db.select().from(beds).where(eq(beds.id, id));
  if (!bed) return NextResponse.json({ error: "Bed not found" }, { status: 404 });

  const status = String(body.status || bed.status);
  if ((status === "occupied" || status === "reserved") && !body.allowManual) {
    return NextResponse.json(
      { error: "Assign a resident to occupy this bed" },
      { status: 400 }
    );
  }
  if (bed.status === "occupied" || bed.status === "reserved") {
    const [t] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.bedId, id), ne(tenants.status, "moved_out")));
    if (t && (status === "available" || status === "maintenance")) {
      return NextResponse.json(
        { error: `${t.name} occupies this bed — check them out first` },
        { status: 400 }
      );
    }
  }
  const [updated] = (await db
    .update(beds)
    .set({ status })
    .where(eq(beds.id, id))
    .returning()) as any[];
  return NextResponse.json(updated);
}
