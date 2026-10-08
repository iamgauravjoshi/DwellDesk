import crypto from "node:crypto";
import { cookies } from "next/headers";

const SECRET =
	process.env.SESSION_SECRET || "pgos-dev-secret-change-in-production";
const COOKIE = "pg_session";
const WEEK = 60 * 60 * 24 * 7;

export type Session = {
	uid: number;
	name: string;
	email: string;
	role: string;
};

export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16).toString("hex");
	const hash = crypto.scryptSync(password, salt, 32).toString("hex");
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(":");
	if (!salt || !hash) return false;
	const test = crypto.scryptSync(password, salt, 32);
	const real = Buffer.from(hash, "hex");
	return test.length === real.length && crypto.timingSafeEqual(test, real);
}

function sign(payload: string): string {
	return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createToken(session: Session): string {
	const payload = Buffer.from(
		JSON.stringify({ ...session, exp: Date.now() + WEEK * 1000 }),
	).toString("base64url");
	return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): Session | null {
	const [payload, sig] = token.split(".");
	if (!payload || !sig) return null;
	const expected = sign(payload);
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
	try {
		const data = JSON.parse(Buffer.from(payload, "base64url").toString());
		if (!data.exp || data.exp < Date.now()) return null;
		return {
			uid: data.uid,
			name: data.name,
			email: data.email,
			role: data.role,
		};
	} catch {
		return null;
	}
}

export async function getSession(): Promise<Session | null> {
	const store = await cookies();
	const token = store.get(COOKIE)?.value;
	if (!token) return null;
	return verifyToken(token);
}

export const sessionCookie = COOKIE;
export const sessionMaxAge = WEEK;
