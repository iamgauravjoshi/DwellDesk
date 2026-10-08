import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createToken,
  sessionCookie,
  sessionMaxAge,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password)
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.email, String(email).toLowerCase().trim()));
  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const session = { uid: user.id, name: user.name, email: user.email, role: user.role };
  const res = NextResponse.json({ user: session });
  res.cookies.set(sessionCookie, createToken(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge,
  });
  return res;
}
