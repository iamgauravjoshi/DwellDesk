import { announcements } from "@/db/schema";
import { itemRoutes, str } from "@/lib/rest";

export const { GET, PATCH, DELETE } = itemRoutes({
  table: announcements,
  entity: "notice",
  shape: (b) => {
    const out: Record<string, unknown> = {};
    if (b.title !== undefined) out.title = str(b.title)!;
    if (b.body !== undefined) out.body = str(b.body)!;
    if (b.audience !== undefined) out.audience = str(b.audience, "all")!;
    return out;
  },
});
