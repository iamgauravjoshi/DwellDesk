import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/rest";

export async function DELETE(req: NextRequest, ctx: any) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await ctx.params).id);
  const [pay] = await db.select().from(payments).where(eq(payments.id, id));
  if (!pay) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  if (pay.invoiceId) {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, pay.invoiceId));
    if (inv) {
      const newPaid = Math.max(0, inv.paidAmount - pay.amount);
      const total = inv.amount + inv.lateFee;
      await db
        .update(invoices)
        .set({
          paidAmount: newPaid,
          status: newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "pending",
          paidAt: null,
        })
        .where(eq(invoices.id, inv.id));
    }
  }
  await db.delete(payments).where(eq(payments.id, id));
  await audit(s.name, "deleted", "payment", id, `${pay.receiptNo} · ₹${pay.amount}`);
  return NextResponse.json({ ok: true });
}
