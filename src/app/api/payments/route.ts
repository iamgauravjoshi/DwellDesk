import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments, properties, tenants } from "@/db/schema";
import { audit, collectionRoutes, str, toInt } from "@/lib/rest";
import { todayISO } from "@/lib/utils";

export const { GET, POST } = collectionRoutes({
  table: payments,
  entity: "payment",
  list: async () => {
    const rows = await db
      .select({
        p: payments,
        tenantName: tenants.name,
        propertyName: properties.name,
        invoiceNo: invoices.invoiceNo,
        invoiceMonth: invoices.monthKey,
      })
      .from(payments)
      .leftJoin(tenants, eq(payments.tenantId, tenants.id))
      .leftJoin(properties, eq(payments.propertyId, properties.id))
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .orderBy(desc(payments.id));
    return rows.map((r) => ({
      ...r.p,
      tenantName: r.tenantName,
      propertyName: r.propertyName,
      invoiceNo: r.invoiceNo,
      invoiceMonth: r.invoiceMonth,
    }));
  },
  create: async (body, s) => {
    const tenantId = toInt(body.tenantId);
    if (!tenantId) throw new Error("Resident is required");
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error("Resident not found");
    const amount = toInt(body.amount, 0);
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    let invoice: any = null;
    if (body.invoiceId) {
      [invoice] = await db.select().from(invoices).where(eq(invoices.id, toInt(body.invoiceId)));
      if (!invoice) throw new Error("Invoice not found");
    }

    const [pay] = (await db
      .insert(payments)
      .values({
        receiptNo: "TMP",
        tenantId,
        invoiceId: invoice?.id ?? null,
        propertyId: tenant.propertyId,
        amount,
        method: str(body.method, "upi")!,
        date: str(body.date, todayISO())!,
        note: str(body.note),
      })
      .returning()) as any[];

    if (invoice) {
      const newPaid = invoice.paidAmount + amount;
      const total = invoice.amount + invoice.lateFee;
      const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : invoice.status;
      await db
        .update(invoices)
        .set({
          paidAmount: newPaid,
          status,
          method: str(body.method, "upi")!,
          paidAt: status === "paid" ? new Date() : invoice.paidAt,
        })
        .where(eq(invoices.id, invoice.id));
    }

    const [row] = (await db
      .update(payments)
      .set({ receiptNo: `RCPT-${String(pay.id).padStart(5, "0")}` })
      .where(eq(payments.id, pay.id))
      .returning()) as any[];

    await audit(
      s.name,
      "recorded",
      "payment",
      pay.id,
      `₹${amount} from ${tenant.name}${invoice ? ` · ${invoice.invoiceNo}` : ""}`
    );
    return row;
  },
});
