import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, properties } from "@/db/schema";
import { collectionRoutes, str, toInt } from "@/lib/rest";
import { todayISO } from "@/lib/utils";

export const { GET, POST } = collectionRoutes({
  table: expenses,
  entity: "expense",
  orderBy: desc(expenses.date),
  shape: (b) => ({
    propertyId: b.propertyId ? toInt(b.propertyId) : null,
    category: str(b.category, "other")!,
    vendor: str(b.vendor),
    amount: toInt(b.amount, 0),
    date: str(b.date, todayISO())!,
    note: str(b.note),
  }),
  list: async () => {
    const rows = await db
      .select({ e: expenses, propertyName: properties.name })
      .from(expenses)
      .leftJoin(properties, eq(expenses.propertyId, properties.id))
      .orderBy(desc(expenses.date), desc(expenses.id));
    return rows.map((r) => ({ ...r.e, propertyName: r.propertyName }));
  },
});
