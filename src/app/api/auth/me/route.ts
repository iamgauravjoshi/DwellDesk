import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(s);
}

export async function PATCH(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name || !String(name).trim())
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  await db.update(users).set({ name: String(name).trim() }).where(eq(users.id, s.uid));
  return NextResponse.json({ ok: true });
}
