import { desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { beds, invoices, payments, properties, rooms, stayHistory, tenants } from "@/db/schema";
import { audit, collectionRoutes, str, toInt } from "@/lib/rest";
import { currentMonthKey, todayISO } from "@/lib/utils";

export const { GET, POST } = collectionRoutes({
  table: tenants,
  entity: "resident",
  list: async (req) => {
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const propertyId = Number(sp.get("propertyId")) || null;

    const rows = await db
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
      .orderBy(desc(tenants.id));

    const duesRows = await db
      .select({
        tenantId: invoices.tenantId,
        due: sql<number>`coalesce(sum(${invoices.amount} + ${invoices.lateFee} - ${invoices.paidAmount}),0)::int`,
      })
      .from(invoices)
      .where(ne(invoices.status, "paid"))
      .groupBy(invoices.tenantId);
    const dueMap = new Map(duesRows.map((d) => [d.tenantId, d.due]));

    return rows
      .map((r) => ({
        ...r.t,
        propertyName: r.propertyName,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        bedLabel: r.bedLabel,
        due: dueMap.get(r.t.id) ?? 0,
      }))
      .filter(
        (r) =>
          (!status || status === "all" || r.status === status) &&
          (!propertyId || r.propertyId === propertyId)
      );
  },
  create: async (body, s) => {
    const propertyId = toInt(body.propertyId);
    if (!propertyId) throw new Error("Property is required");
    if (!str(body.name)) throw new Error("Resident name is required");
    if (!str(body.phone)) throw new Error("Phone number is required");

    const status = (str(body.status, "active") as string)!;
    const joinDate = str(body.joinDate, todayISO())!;
    let roomId = body.roomId ? toInt(body.roomId) : null;
    let bedId = body.bedId ? toInt(body.bedId) : null;
    let rent = toInt(body.rent, 0);

    let bed: any = null;
    if (bedId) {
      [bed] = await db.select().from(beds).where(eq(beds.id, bedId));
      if (!bed) throw new Error("Selected bed not found");
      if (bed.status === "occupied" || bed.status === "reserved")
        throw new Error("That bed is already taken");
      const [roomRow] = await db.select().from(rooms).where(eq(rooms.id, bed.roomId));
      roomId = bed.roomId;
      if (!rent) rent = roomRow?.rent ?? 0;
    }

    const [tenant] = (await db
      .insert(tenants)
      .values({
        propertyId,
        roomId,
        bedId,
        name: str(body.name)!,
        phone: str(body.phone)!,
        email: str(body.email),
        gender: str(body.gender, "male")!,
        dob: str(body.dob),
        occupation: str(body.occupation),
        organization: str(body.organization),
        permanentAddress: str(body.permanentAddress),
        idType: str(body.idType, "aadhaar"),
        idNumber: str(body.idNumber),
        guardianName: str(body.guardianName),
        guardianPhone: str(body.guardianPhone),
        joinDate,
        rent,
        deposit: toInt(body.deposit, 0),
        status,
        notes: str(body.notes),
      })
      .returning()) as any[];

    if (bedId && bed) {
      await db
        .update(beds)
        .set({ status: status === "reserved" ? "reserved" : "occupied" })
        .where(eq(beds.id, bedId));
      await db.insert(stayHistory).values({
        tenantId: tenant.id,
        propertyId,
        roomId: roomId!,
        bedId,
        fromDate: joinDate,
        reason: "check-in",
      });
    }

    if (toInt(body.deposit, 0) > 0 && body.depositPaid !== false) {
      const [pay] = (await db
        .insert(payments)
        .values({
          receiptNo: "TMP",
          tenantId: tenant.id,
          propertyId,
          amount: toInt(body.deposit, 0),
          method: str(body.method, "upi")!,
          date: joinDate,
          note: "Security deposit",
        })
        .returning()) as any[];
      await db
        .update(payments)
        .set({ receiptNo: `RCPT-${String(pay.id).padStart(5, "0")}` })
        .where(eq(payments.id, pay.id));
    }

    if (body.firstInvoice && rent > 0 && status === "active") {
      const monthKey = currentMonthKey();
      const [y, m] = monthKey.split("-").map(Number);
      const due = new Date(y, m, 5);
      const [inv] = (await db
        .insert(invoices)
        .values({
          invoiceNo: "TMP",
          tenantId: tenant.id,
          propertyId,
          monthKey,
          amount: rent,
          dueDate: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`,
          note: `Rent for ${monthKey}`,
        })
        .returning()) as any[];
      await db
        .update(invoices)
        .set({ invoiceNo: `INV-${String(inv.id).padStart(5, "0")}` })
        .where(eq(invoices.id, inv.id));
    }

    await audit(s.name, "created", "resident", tenant.id, `${tenant.name} checked in`);
    return tenant;
  },
});
