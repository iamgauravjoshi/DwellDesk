import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { properties, staff } from "@/db/schema";
import { collectionRoutes, str, toInt } from "@/lib/rest";
import { todayISO } from "@/lib/utils";

export const { GET, POST } = collectionRoutes({
  table: staff,
  entity: "staff",
  orderBy: desc(staff.id),
  shape: (b) => ({
    propertyId: b.propertyId ? toInt(b.propertyId) : null,
    name: str(b.name, "")!,
    role: str(b.role, "caretaker")!,
    phone: str(b.phone, "")!,
    salary: toInt(b.salary, 12000),
    shift: str(b.shift, "day")!,
    joinedOn: str(b.joinedOn, todayISO()),
    status: str(b.status, "active")!,
  }),
  list: async () => {
    const rows = await db
      .select({ s: staff, propertyName: properties.name })
      .from(staff)
      .leftJoin(properties, eq(staff.propertyId, properties.id))
      .orderBy(desc(staff.id));
    return rows.map((r) => ({ ...r.s, propertyName: r.propertyName }));
  },
});
