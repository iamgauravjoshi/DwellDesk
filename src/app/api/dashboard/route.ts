import { NextResponse } from "next/server";
import { and, desc, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  beds,
  complaints,
  invoices,
  payments,
  properties,
  rooms,
  tenants,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { currentMonthKey, lastMonths, monthLabel, todayISO } from "@/lib/utils";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = todayISO();
  const mk = currentMonthKey();
  const months = lastMonths(6);

  const [bedStatus, residentCounts, finance] = await Promise.all([
    db.select({ status: beds.status, count: sql<number>`count(*)::int` }).from(beds).groupBy(beds.status),
    db.select({ status: tenants.status, count: sql<number>`count(*)::int` }).from(tenants).groupBy(tenants.status),
    db
      .select({
        billed: sql<number>`coalesce(sum(${invoices.amount} + ${invoices.lateFee}),0)::int`,
        collected: sql<number>`coalesce(sum(${invoices.paidAmount}),0)::int`,
      })
      .from(invoices)
      .where(eq(invoices.monthKey, mk)),
  ]);

  const [outstandingRows, overdueRows, monthlyPayments, monthlyExpenses, occupancyByProp, recentPayments, dues, openComplaints, activity, complaintCounts] =
    await Promise.all([
      db
        .select({ due: sql<number>`coalesce(sum(${invoices.amount} + ${invoices.lateFee} - ${invoices.paidAmount}),0)::int` })
        .from(invoices)
        .where(ne(invoices.status, "paid")),
      db
        .select({ count: sql<number>`count(*)::int`, amount: sql<number>`coalesce(sum(${invoices.amount} + ${invoices.lateFee} - ${invoices.paidAmount}),0)::int` })
        .from(invoices)
        .where(and(ne(invoices.status, "paid"), lt(invoices.dueDate, today))),
      db.execute(sql`
        select to_char(date_trunc('month', date::date), 'YYYY-MM') as mk, coalesce(sum(amount),0)::int as total
        from payments group by 1 order by 1
      `),
      db.execute(sql`
        select to_char(date_trunc('month', date::date), 'YYYY-MM') as mk, coalesce(sum(amount),0)::int as total
        from expenses group by 1 order by 1
      `),
      db
        .select({
          id: properties.id,
          name: properties.name,
          total: sql<number>`count(${beds.id})::int`,
          occupied: sql<number>`count(*) filter (where ${beds.status} = 'occupied')::int`,
        })
        .from(properties)
        .leftJoin(rooms, eq(rooms.propertyId, properties.id))
        .leftJoin(beds, eq(beds.roomId, rooms.id))
        .groupBy(properties.id, properties.name)
        .orderBy(properties.id),
      db
        .select({ p: payments, tenantName: tenants.name })
        .from(payments)
        .leftJoin(tenants, eq(payments.tenantId, tenants.id))
        .orderBy(desc(payments.id))
        .limit(5),
      db
        .select({ i: invoices, tenantName: tenants.name })
        .from(invoices)
        .leftJoin(tenants, eq(invoices.tenantId, tenants.id))
        .where(ne(invoices.status, "paid"))
        .orderBy(invoices.dueDate)
        .limit(6),
      db
        .select({ c: complaints, tenantName: tenants.name, propertyName: properties.name })
        .from(complaints)
        .leftJoin(tenants, eq(complaints.tenantId, tenants.id))
        .leftJoin(properties, eq(complaints.propertyId, properties.id))
        .where(ne(complaints.status, "resolved"))
        .orderBy(desc(complaints.id))
        .limit(5),
      db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(8),
      db.select({ status: complaints.status, count: sql<number>`count(*)::int` }).from(complaints).groupBy(complaints.status),
    ]);

  const bedMap = Object.fromEntries(bedStatus.map((b) => [b.status, b.count]));
  const totalBeds = bedStatus.reduce((a, b) => a + b.count, 0);
  const occupied = bedMap.occupied ?? 0;

  const inc = Object.fromEntries((monthlyPayments.rows as any[]).map((r) => [r.mk, r.total]));
  const exp = Object.fromEntries((monthlyExpenses.rows as any[]).map((r) => [r.mk, r.total]));

  return NextResponse.json({
    stats: {
      totalBeds,
      occupied,
      available: bedMap.available ?? 0,
      reserved: bedMap.reserved ?? 0,
      maintenance: bedMap.maintenance ?? 0,
      occupancyPct: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0,
      residents: residentCounts.find((r) => r.status === "active")?.count ?? 0,
      reservedResidents: residentCounts.find((r) => r.status === "reserved")?.count ?? 0,
      billedThisMonth: finance[0]?.billed ?? 0,
      collectedThisMonth: finance[0]?.collected ?? 0,
      outstanding: outstandingRows[0]?.due ?? 0,
      overdueCount: overdueRows[0]?.count ?? 0,
      overdueAmount: overdueRows[0]?.amount ?? 0,
      openComplaints: complaintCounts
        .filter((c) => c.status !== "resolved")
        .reduce((a, c) => a + c.count, 0),
    },
    revenueSeries: {
      labels: months.map(monthLabel),
      income: months.map((m) => inc[m] ?? 0),
      expense: months.map((m) => exp[m] ?? 0),
    },
    bedStatus: [
      { label: "Occupied", value: occupied, color: "#6e63d9" },
      { label: "Available", value: bedMap.available ?? 0, color: "#10b981" },
      { label: "Reserved", value: bedMap.reserved ?? 0, color: "#0ea5e9" },
      { label: "Maintenance", value: bedMap.maintenance ?? 0, color: "#f59e0b" },
    ],
    occupancyByProperty: occupancyByProp,
    recentPayments: recentPayments.map((r) => ({ ...r.p, tenantName: r.tenantName })),
    dues: dues.map((r) => ({ ...r.i, tenantName: r.tenantName })),
    openComplaints: openComplaints.map((r) => ({
      ...r.c,
      tenantName: r.tenantName,
      propertyName: r.propertyName,
    })),
    activity,
  });
}
