import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { beds, rooms, tenants } from "@/db/schema";
import { audit, collectionRoutes, str, toInt } from "@/lib/rest";

const CAPACITY: Record<string, number> = { single: 1, double: 2, triple: 3, quad: 4 };
const LABELS = ["A", "B", "C", "D", "E", "F"];

export const { GET, POST } = collectionRoutes({
  table: rooms,
  entity: "room",
  list: async (req) => {
    const propertyId = Number(new URL(req.url).searchParams.get("propertyId")) || null;
    const roomRows = propertyId
      ? await db.select().from(rooms).where(eq(rooms.propertyId, propertyId)).orderBy(asc(rooms.floor), asc(rooms.number))
      : await db.select().from(rooms).orderBy(asc(rooms.propertyId), asc(rooms.floor), asc(rooms.number));
    if (roomRows.length === 0) return [];
    const roomIds = roomRows.map((r) => r.id);
    const bedRows = await db
      .select()
      .from(beds)
      .where(inArray(beds.roomId, roomIds))
      .orderBy(asc(beds.label));
    const bedIds = bedRows.map((b) => b.id);
    const occupantRows = bedIds.length
      ? await db
          .select({ bedId: tenants.bedId, id: tenants.id, name: tenants.name, status: tenants.status })
          .from(tenants)
          .where(
            and(inArray(tenants.bedId, bedIds), inArray(tenants.status, ["active", "reserved"]))
          )
      : [];
    const occupants = new Map(
      occupantRows
        .filter((t) => t.bedId)
        .map((t) => [t.bedId as number, { id: t.id, name: t.name, status: t.status }])
    );
    return roomRows.map((r) => ({
      ...r,
      beds: bedRows
        .filter((b) => b.roomId === r.id)
        .map((b) => ({ ...b, occupant: occupants.get(b.id) ?? null })),
    }));
  },
  create: async (body, s) => {
    const propertyId = toInt(body.propertyId);
    if (!propertyId) throw new Error("Property is required");
    const type = str(body.type, "double")!;
    const capacity = toInt(body.capacity, CAPACITY[type] ?? 2);
    const [room] = (await db
      .insert(rooms)
      .values({
        propertyId,
        floor: toInt(body.floor, 1),
        number: str(body.number, "")!,
        type,
        capacity,
        rent: toInt(body.rent, 8000),
        attachedBath: !!body.attachedBath,
        amenities: Array.isArray(body.amenities) ? body.amenities : [],
      })
      .returning()) as any[];
    await db.insert(beds).values(
      Array.from({ length: Math.min(6, Math.max(1, capacity)) }).map((_, i) => ({
        roomId: room.id,
        label: LABELS[i],
        status: room.status === "maintenance" ? "maintenance" : "available",
      }))
    );
    await audit(
      s.name,
      "created",
      "room",
      room.id,
      `Room ${room.number} (${type}, ${capacity} bed${capacity > 1 ? "s" : ""})`
    );
    return room;
  },
});
