import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messMenus } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/rest";
import { toInt } from "@/lib/rest";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(messMenus).orderBy(asc(messMenus.dayOfWeek));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const dayOfWeek = toInt(body.dayOfWeek, -1);
  if (dayOfWeek < 0 || dayOfWeek > 6)
    return NextResponse.json({ error: "dayOfWeek must be 0–6" }, { status: 400 });

  const values = {
    dayOfWeek,
    breakfast: String(body.breakfast ?? ""),
    lunch: String(body.lunch ?? ""),
    snacks: String(body.snacks ?? ""),
    dinner: String(body.dinner ?? ""),
  };

  const [existing] = await db
    .select()
    .from(messMenus)
    .where(eq(messMenus.dayOfWeek, dayOfWeek));
  let row;
  if (existing) {
    [row] = (await db
      .update(messMenus)
      .set(values)
      .where(eq(messMenus.id, existing.id))
      .returning()) as any[];
  } else {
    [row] = (await db.insert(messMenus).values(values).returning()) as any[];
  }
  await audit(s.name, "updated", "mess menu", dayOfWeek, null);
  return NextResponse.json(row);
}
