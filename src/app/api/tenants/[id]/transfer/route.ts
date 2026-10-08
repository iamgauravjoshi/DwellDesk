import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { beds, rooms, stayHistory, tenants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/rest";
import { todayISO } from "@/lib/utils";

export async function POST(req: NextRequest, ctx: any) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const { bedId } = await req.json().catch(() => ({}));
  if (!bedId) return NextResponse.json({ error: "Target bed is required" }, { status: 400 });

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
  if (!tenant) return NextResponse.json({ error: "Resident not found" }, { status: 404 });

  const [bed] = await db.select().from(beds).where(eq(beds.id, Number(bedId)));
  if (!bed) return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  if (bed.status === "occupied" || bed.status === "reserved")
    return NextResponse.json({ error: "That bed is already taken" }, { status: 400 });

  const [room] = await db.select().from(rooms).where(eq(rooms.id, bed.roomId));

  // free old bed + close stay
  if (tenant.bedId)
    await db.update(beds).set({ status: "available" }).where(eq(beds.id, tenant.bedId));
  await db
    .update(stayHistory)
    .set({ toDate: todayISO() })
    .where(and(eq(stayHistory.tenantId, id), isNull(stayHistory.toDate)));

  // occupy new bed + open stay
  await db
    .update(beds)
    .set({ status: tenant.status === "reserved" ? "reserved" : "occupied" })
    .where(eq(beds.id, bed.id));
  await db.insert(stayHistory).values({
    tenantId: id,
    propertyId: room.propertyId,
    roomId: room.id,
    bedId: bed.id,
    fromDate: todayISO(),
    reason: "transfer",
  });
  const [updated] = (await db
    .update(tenants)
    .set({
      bedId: bed.id,
      roomId: room.id,
      propertyId: room.propertyId,
      rent: tenant.rent > 0 ? tenant.rent : room.rent,
    })
    .where(eq(tenants.id, id))
    .returning()) as any[];

  await audit(
    s.name,
    "transferred",
    "resident",
    id,
    `${tenant.name} moved to room ${room.number} · bed ${bed.label}`
  );
  return NextResponse.json(updated);
}
