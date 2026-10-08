import { eq } from "drizzle-orm";
import { db } from "@/db";
import { beds, rooms, tenants } from "@/db/schema";
import { fail, itemRoutes, str, toInt } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: rooms,
  entity: "room",
  shape: (b) => {
    const out: Record<string, unknown> = {};
    if (b.floor !== undefined) out.floor = toInt(b.floor, 1);
    if (b.number !== undefined) out.number = str(b.number, "")!;
    if (b.type !== undefined) out.type = str(b.type, "double")!;
    if (b.rent !== undefined) out.rent = toInt(b.rent, 0);
    if (b.attachedBath !== undefined) out.attachedBath = !!b.attachedBath;
    if (b.status !== undefined) out.status = str(b.status, "active")!;
    if (b.amenities !== undefined) out.amenities = Array.isArray(b.amenities) ? b.amenities : [];
    return out;
  },
  remove: async (id) => {
    const roomBeds = await db.select().from(beds).where(eq(beds.roomId, id));
    const occupied = roomBeds.some((b) => b.status === "occupied" || b.status === "reserved");
    if (occupied) throw new Error("Room has residents — check them out first");
    await db.update(tenants).set({ roomId: null, bedId: null }).where(eq(tenants.roomId, id));
    const [row] = (await db.delete(rooms).where(eq(rooms.id, id)).returning()) as any[];
    return row ?? fail("Not found", 404);
  },
});
