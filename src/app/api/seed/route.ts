import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resetDatabase, runSeed } from "@/db/seed";
import { audit } from "@/lib/rest";

export async function POST() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await resetDatabase();
    const res = await runSeed();
    await audit(s.name, "reset", "workspace", null, "Demo data reseeded");
    return NextResponse.json({ ok: true, owner: res.owner });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Seed failed" }, { status: 500 });
  }
}
