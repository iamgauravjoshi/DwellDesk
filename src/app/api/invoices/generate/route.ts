import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { invoices, tenants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/rest";
import { monthLabel } from "@/lib/utils";

/** Generate monthly rent invoices for every active resident. */
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { monthKey } = await req.json().catch(() => ({}));
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey))
    return NextResponse.json({ error: "Valid monthKey (YYYY-MM) is required" }, { status: 400 });

  const [y, m] = monthKey.split("-").map(Number);
  const due = new Date(y, m, 5); // 5th of the following month
  const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(
    due.getDate()
  ).padStart(2, "0")}`;

  const active = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.status, "active"), gt(tenants.rent, 0)));

  if (active.length === 0)
    return NextResponse.json({ created: 0, skipped: 0, monthKey });

  const existing = await db
    .select({ tenantId: invoices.tenantId })
    .from(invoices)
    .where(
      and(eq(invoices.monthKey, monthKey), inArray(invoices.tenantId, active.map((t) => t.id)))
    );
  const existingSet = new Set(existing.map((e) => e.tenantId));
  const toCreate = active.filter((t) => !existingSet.has(t.id));

  for (const t of toCreate) {
    const [inv] = (await db
      .insert(invoices)
      .values({
        invoiceNo: "TMP",
        tenantId: t.id,
        propertyId: t.propertyId,
        monthKey,
        amount: t.rent,
        dueDate,
        note: `Rent for ${monthLabel(monthKey)}`,
      })
      .returning()) as any[];
    await db
      .update(invoices)
      .set({ invoiceNo: `INV-${String(inv.id).padStart(5, "0")}` })
      .where(eq(invoices.id, inv.id));
  }

  await audit(
    s.name,
    "generated",
    "invoice",
    null,
    `${toCreate.length} invoices for ${monthLabel(monthKey)}`
  );
  return NextResponse.json({
    created: toCreate.length,
    skipped: existingSet.size,
    monthKey,
  });
}
