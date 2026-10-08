import { eq } from "drizzle-orm";
import { db } from "@/db";
import { complaints } from "@/db/schema";
import { audit, itemRoutes, ok, str, toInt } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: complaints,
  entity: "complaint",
  patch: async (id, body, s) => {
    const out: Record<string, unknown> = {};
    if (body.title !== undefined) out.title = str(body.title)!;
    if (body.category !== undefined) out.category = str(body.category)!;
    if (body.priority !== undefined) out.priority = str(body.priority)!;
    if (body.description !== undefined) out.description = str(body.description);
    if (body.propertyId !== undefined) out.propertyId = toInt(body.propertyId);
    if (body.tenantId !== undefined) out.tenantId = body.tenantId ? toInt(body.tenantId) : null;
    if (body.status !== undefined) {
      out.status = str(body.status)!;
      out.resolvedAt = body.status === "resolved" ? new Date() : null;
    }
    const [row] = (await db
      .update(complaints)
      .set(out)
      .where(eq(complaints.id, id))
      .returning()) as any[];
    if (!row) return ok({ error: "Not found" } , 404);
    await audit(s.name, "updated", "complaint", id, `${row.title} → ${row.status}`);
    return ok(row);
  },
});
