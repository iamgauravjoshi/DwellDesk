import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { complaints, properties, tenants } from "@/db/schema";
import { collectionRoutes, str, toInt } from "@/lib/rest";

export const { GET, POST } = collectionRoutes({
  table: complaints,
  entity: "complaint",
  orderBy: desc(complaints.id),
  shape: (b) => ({
    propertyId: toInt(b.propertyId),
    tenantId: b.tenantId ? toInt(b.tenantId) : null,
    title: str(b.title, "")!,
    category: str(b.category, "other")!,
    priority: str(b.priority, "medium")!,
    description: str(b.description),
  }),
  list: async () => {
    const rows = await db
      .select({ c: complaints, tenantName: tenants.name, propertyName: properties.name })
      .from(complaints)
      .leftJoin(tenants, eq(complaints.tenantId, tenants.id))
      .leftJoin(properties, eq(complaints.propertyId, properties.id))
      .orderBy(desc(complaints.id));
    return rows.map((r) => ({
      ...r.c,
      tenantName: r.tenantName,
      propertyName: r.propertyName,
    }));
  },
});
