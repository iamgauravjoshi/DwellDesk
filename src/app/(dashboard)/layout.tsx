import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Shell from "@/components/shell";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <Shell user={session}>{children}</Shell>;
}
