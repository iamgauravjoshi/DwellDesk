import { sql } from "drizzle-orm";
import { db } from "@/db";
import { beds, invoices, properties, rooms, tenants } from "@/db/schema";
import { collectionRoutes, str, toInt } from "@/lib/rest";
import { currentMonthKey } from "@/lib/utils";

export const { GET, POST } = collectionRoutes({
  table: properties,
  entity: "property",
  shape: (b) => ({
    name: str(b.name, "")!,
    code: str(b.code, "")!.toUpperCase(),
    type: str(b.type, "pg")!,
    address: str(b.address, "")!,
    city: str(b.city, "Bengaluru")!,
    floors: toInt(b.floors, 1),
    amenities: Array.isArray(b.amenities) ? b.amenities : [],
    managerName: str(b.managerName),
    phone: str(b.phone),
  }),
  list: async () => {
    const props = await db.select().from(properties).orderBy(properties.id);
    const roomRows = await db.select().from(rooms);
    const bedRows = await db.select().from(beds);
    const tenantCounts = await db
      .select({
        propertyId: tenants.propertyId,
        count: sql<number>`count(*)::int`,
      })
      .from(tenants)
      .where(sql`${tenants.status} = 'active'`)
      .groupBy(tenants.propertyId);
    const revenue = await db
      .select({
        propertyId: invoices.propertyId,
        collected: sql<number>`coalesce(sum(${invoices.paidAmount}),0)::int`,
        pending: sql<number>`coalesce(sum(${invoices.amount} + ${invoices.lateFee} - ${invoices.paidAmount}),0)::int`,
      })
      .from(invoices)
      .where(sql`${invoices.monthKey} = ${currentMonthKey()}`)
      .groupBy(invoices.propertyId);

    const roomById = new Map(roomRows.map((r) => [r.id, r]));
    return props.map((p) => {
      const pRooms = roomRows.filter((r) => r.propertyId === p.id);
      const pBeds = bedRows.filter((b) => roomById.get(b.roomId)?.propertyId === p.id);
      const occupied = pBeds.filter((b) => b.status === "occupied").length;
      return {
        ...p,
        roomsCount: pRooms.length,
        bedsCount: pBeds.length,
        occupiedBeds: occupied,
        availableBeds: pBeds.filter((b) => b.status === "available").length,
        residents: tenantCounts.find((t) => t.propertyId === p.id)?.count ?? 0,
        collectedThisMonth: revenue.find((r) => r.propertyId === p.id)?.collected ?? 0,
        pendingThisMonth: revenue.find((r) => r.propertyId === p.id)?.pending ?? 0,
      };
    });
  },
});
