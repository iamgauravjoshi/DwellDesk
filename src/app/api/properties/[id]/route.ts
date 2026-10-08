import { properties } from "@/db/schema";
import { itemRoutes, str, toInt } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: properties,
  entity: "property",
  shape: (b) => {
    const out: Record<string, unknown> = {};
    if (b.name !== undefined) out.name = str(b.name, "")!;
    if (b.code !== undefined) out.code = str(b.code, "")!.toUpperCase();
    if (b.type !== undefined) out.type = str(b.type, "pg")!;
    if (b.address !== undefined) out.address = str(b.address, "")!;
    if (b.city !== undefined) out.city = str(b.city, "")!;
    if (b.floors !== undefined) out.floors = toInt(b.floors, 1);
    if (b.amenities !== undefined) out.amenities = Array.isArray(b.amenities) ? b.amenities : [];
    if (b.managerName !== undefined) out.managerName = str(b.managerName);
    if (b.phone !== undefined) out.phone = str(b.phone);
    return out;
  },
});
