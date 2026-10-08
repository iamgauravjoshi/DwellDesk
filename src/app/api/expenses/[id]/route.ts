import { expenses } from "@/db/schema";
import { itemRoutes, str, toInt } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: expenses,
  entity: "expense",
  shape: (b) => {
    const out: Record<string, unknown> = {};
    if (b.propertyId !== undefined) out.propertyId = b.propertyId ? toInt(b.propertyId) : null;
    if (b.category !== undefined) out.category = str(b.category, "other")!;
    if (b.vendor !== undefined) out.vendor = str(b.vendor);
    if (b.amount !== undefined) out.amount = toInt(b.amount, 0);
    if (b.date !== undefined) out.date = str(b.date)!;
    if (b.note !== undefined) out.note = str(b.note);
    return out;
  },
});
