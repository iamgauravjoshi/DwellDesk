import { desc } from "drizzle-orm";
import { announcements } from "@/db/schema";
import { collectionRoutes, str } from "@/lib/rest";

export const { GET, POST } = collectionRoutes({
  table: announcements,
  entity: "notice",
  orderBy: desc(announcements.id),
  shape: (b) => ({
    title: str(b.title, "")!,
    body: str(b.body, "")!,
    audience: str(b.audience, "all")!,
  }),
});
