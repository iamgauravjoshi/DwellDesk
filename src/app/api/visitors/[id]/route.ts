import { eq } from "drizzle-orm";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { audit, itemRoutes, ok } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: visitors,
  entity: "visitor",
  patch: async (id, body, s) => {
    const out: Record<string, unknown> = {};
    if (body.checkOut !== undefined) out.checkOut = body.checkOut ? new Date() : null;
    if (body.name !== undefined) out.name = String(body.name);
    if (body.purpose !== undefined) out.purpose = body.purpose || null;
    const [row] = (await db
      .update(visitors)
      .set(out)
      .where(eq(visitors.id, id))
      .returning()) as any[];
    if (!row) return ok({ error: "Not found" }, 404);
    if (body.checkOut) await audit(s.name, "checked out", "visitor", id, row.name);
    return ok(row);
  },
});
