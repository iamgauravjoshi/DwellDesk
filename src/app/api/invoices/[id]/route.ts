import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { itemRoutes, str, toInt } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: invoices,
  entity: "invoice",
  shape: (b) => {
    const out: Record<string, unknown> = {};
    if (b.amount !== undefined) out.amount = toInt(b.amount, 0);
    if (b.lateFee !== undefined) out.lateFee = toInt(b.lateFee, 0);
    if (b.dueDate !== undefined) out.dueDate = str(b.dueDate);
    if (b.note !== undefined) out.note = str(b.note);
    return out;
  },
});
