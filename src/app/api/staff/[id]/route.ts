import { staff } from "@/db/schema";
import { itemRoutes, str, toInt } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: staff,
  entity: "staff",
  shape: (b) => {
    const out: Record<string, unknown> = {};
    if (b.propertyId !== undefined) out.propertyId = b.propertyId ? toInt(b.propertyId) : null;
    if (b.name !== undefined) out.name = str(b.name)!;
    if (b.role !== undefined) out.role = str(b.role, "caretaker")!;
    if (b.phone !== undefined) out.phone = str(b.phone)!;
    if (b.salary !== undefined) out.salary = toInt(b.salary, 0);
    if (b.shift !== undefined) out.shift = str(b.shift, "day")!;
    if (b.joinedOn !== undefined) out.joinedOn = str(b.joinedOn);
    if (b.status !== undefined) out.status = str(b.status, "active")!;
    return out;
  },
});
