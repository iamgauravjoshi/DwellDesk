import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
