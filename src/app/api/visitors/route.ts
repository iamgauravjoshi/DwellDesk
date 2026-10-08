import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { properties, tenants, visitors } from "@/db/schema";
import { collectionRoutes, str, toInt } from "@/lib/rest";

export const { GET, POST } = collectionRoutes({
  table: visitors,
  entity: "visitor",
  shape: (b) => ({
    propertyId: toInt(b.propertyId),
    tenantId: b.tenantId ? toInt(b.tenantId) : null,
    name: str(b.name, "")!,
    relation: str(b.relation),
    purpose: str(b.purpose),
  }),
  list: async () => {
    const rows = await db
      .select({ v: visitors, tenantName: tenants.name, propertyName: properties.name })
      .from(visitors)
      .leftJoin(tenants, eq(visitors.tenantId, tenants.id))
      .leftJoin(properties, eq(visitors.propertyId, properties.id))
      .orderBy(desc(visitors.checkIn));
    return rows.map((r) => ({
      ...r.v,
      tenantName: r.tenantName,
      propertyName: r.propertyName,
    }));
  },
});
