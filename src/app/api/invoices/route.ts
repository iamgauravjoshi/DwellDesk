import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, properties, tenants } from "@/db/schema";
import { collectionRoutes, str, toInt } from "@/lib/rest";

export const { GET, POST } = collectionRoutes({
  table: invoices,
  entity: "invoice",
  list: async (req) => {
    const sp = new URL(req.url).searchParams;
    const month = sp.get("month");
    const status = sp.get("status");
    const rows = await db
      .select({
        i: invoices,
        tenantName: tenants.name,
        propertyName: properties.name,
      })
      .from(invoices)
      .leftJoin(tenants, eq(invoices.tenantId, tenants.id))
      .leftJoin(properties, eq(invoices.propertyId, properties.id))
      .orderBy(desc(invoices.id));
    return rows
      .map((r) => ({ ...r.i, tenantName: r.tenantName, propertyName: r.propertyName }))
      .filter(
        (r) =>
          (!month || month === "all" || r.monthKey === month) &&
          (!status || status === "all" || r.status === status)
      );
  },
  create: async (body, s) => {
    const tenantId = toInt(body.tenantId);
    if (!tenantId) throw new Error("Resident is required");
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) throw new Error("Resident not found");
    const amount = toInt(body.amount, tenant.rent);
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    const [inv] = (await db
      .insert(invoices)
      .values({
        invoiceNo: "TMP",
        tenantId,
        propertyId: tenant.propertyId,
        monthKey: str(body.monthKey, "")!,
        amount,
        lateFee: toInt(body.lateFee, 0),
        dueDate: str(body.dueDate),
        note: str(body.note),
      })
      .returning()) as any[];
    if (!inv.monthKey) throw new Error("Billing month is required");
    const [row] = (await db
      .update(invoices)
      .set({ invoiceNo: `INV-${String(inv.id).padStart(5, "0")}` })
      .where(eq(invoices.id, inv.id))
      .returning()) as any[];
    const { audit } = await import("@/lib/rest");
    await audit(s.name, "created", "invoice", inv.id, `₹${amount} for ${tenant.name}`);
    return row;
  },
});
