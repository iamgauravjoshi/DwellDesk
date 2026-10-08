import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  beds,
  complaints,
  invoices,
  payments,
  properties,
  rooms,
  stayHistory,
  tenants,
} from "@/db/schema";
import { audit, fail, itemRoutes, ok, str, toInt } from "@/lib/rest";
import { todayISO } from "@/lib/utils";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: tenants,
  entity: "resident",
  get: async (id) => {
    const [row] = await db
      .select({
        t: tenants,
        propertyName: properties.name,
        roomNumber: rooms.number,
        roomType: rooms.type,
        bedLabel: beds.label,
      })
      .from(tenants)
      .leftJoin(properties, eq(tenants.propertyId, properties.id))
      .leftJoin(rooms, eq(tenants.roomId, rooms.id))
      .leftJoin(beds, eq(tenants.bedId, beds.id))
      .where(eq(tenants.id, id));
    if (!row) return fail("Resident not found", 404);

    const inv = await db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, id))
      .orderBy(desc(invoices.monthKey));
    const pays = await db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, id))
      .orderBy(desc(payments.date));
    const stays = await db
      .select({
        s: stayHistory,
        propertyName: properties.name,
        roomNumber: rooms.number,
        bedLabel: beds.label,
      })
      .from(stayHistory)
      .leftJoin(properties, eq(stayHistory.propertyId, properties.id))
      .leftJoin(rooms, eq(stayHistory.roomId, rooms.id))
      .leftJoin(beds, eq(stayHistory.bedId, beds.id))
      .where(eq(stayHistory.tenantId, id))
      .orderBy(desc(stayHistory.fromDate));
    const compl = await db
      .select()
      .from(complaints)
      .where(eq(complaints.tenantId, id))
      .orderBy(desc(complaints.id));

    const outstanding = inv
      .filter((i) => i.status !== "paid")
      .reduce((a, i) => a + i.amount + i.lateFee - i.paidAmount, 0);
    const totalPaid = pays.reduce((a, p) => a + p.amount, 0);

    return {
      tenant: {
        ...row.t,
        propertyName: row.propertyName,
        roomNumber: row.roomNumber,
        roomType: row.roomType,
        bedLabel: row.bedLabel,
      },
      invoices: inv,
      payments: pays,
      stays: stays.map((s) => ({
        ...s.s,
        propertyName: s.propertyName,
        roomNumber: s.roomNumber,
        bedLabel: s.bedLabel,
      })),
      complaints: compl,
      stats: { outstanding, totalPaid, invoiceCount: inv.length },
    };
  },
  patch: async (id, body, s) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) return fail("Resident not found", 404);

    // Check-out flow
    if (body.status === "moved_out" && tenant.status !== "moved_out") {
      const moveOut = str(body.moveOutDate, todayISO())!;
      if (tenant.bedId) {
        await db.update(beds).set({ status: "available" }).where(eq(beds.id, tenant.bedId));
      }
      await db
        .update(stayHistory)
        .set({ toDate: moveOut })
        .where(and(eq(stayHistory.tenantId, id), isNull(stayHistory.toDate)));
      const [row] = (await db
        .update(tenants)
        .set({ status: "moved_out", moveOutDate: moveOut, bedId: null, roomId: null })
        .where(eq(tenants.id, id))
        .returning()) as any[];
      await audit(s.name, "checked out", "resident", id, tenant.name);
      return ok(row);
    }

    // Activate reserved booking
    if (body.status === "active" && tenant.status === "reserved") {
      if (tenant.bedId)
        await db.update(beds).set({ status: "occupied" }).where(eq(beds.id, tenant.bedId));
      const [row] = (await db
        .update(tenants)
        .set({ status: "active", joinDate: str(body.joinDate, tenant.joinDate)! })
        .where(eq(tenants.id, id))
        .returning()) as any[];
      await audit(s.name, "activated booking", "resident", id, tenant.name);
      return ok(row);
    }

    const out: Record<string, unknown> = {};
    const fields = [
      "name", "phone", "email", "gender", "dob", "occupation", "organization",
      "permanentAddress", "idType", "idNumber", "guardianName", "guardianPhone", "notes", "status",
    ];
    const map: Record<string, string> = {
      permanentAddress: "permanentAddress",
      idType: "idType",
      idNumber: "idNumber",
      guardianName: "guardianName",
      guardianPhone: "guardianPhone",
    };
    for (const f of fields) {
      if (body[f] !== undefined) out[map[f] ?? f] = body[f] === "" ? null : body[f];
    }
    if (body.rent !== undefined) out.rent = toInt(body.rent, tenant.rent);
    if (body.deposit !== undefined) out.deposit = toInt(body.deposit, tenant.deposit);
    if (body.joinDate !== undefined) out.joinDate = str(body.joinDate, tenant.joinDate)!;

    const [row] = (await db
      .update(tenants)
      .set(out)
      .where(eq(tenants.id, id))
      .returning()) as any[];
    await audit(s.name, "updated", "resident", id, row.name);
    return ok(row);
  },
});
