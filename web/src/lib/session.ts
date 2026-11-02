import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const ACTIVE_COOKIE = "hd_active_member";
export const PIN_PROOF_COOKIE = "hd_pin_ok";

function secret(): Uint8Array {
  const base = process.env.SESSION_SECRET || process.env.DATABASE_URL || process.env.TELEGRAM_BOT_TOKEN || "hd-dev-insecure-secret";
  return createHash("sha256").update(`hd-session:${base}`).digest();
}

async function sign(memberId: number, ttl: string, purpose: string): Promise<string> {
  return new SignJWT({ mid: memberId, p: purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret());
}

async function read(token: string | undefined, purpose: string): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.p === purpose && typeof payload.mid === "number" ? payload.mid : null;
  } catch {
    return null;
  }
}

const baseOpts = { path: "/", httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };

/** Miembro activo a partir de la cookie firmada (null si falta o es inválida/manipulada). */
export async function getActiveMemberId(): Promise<number | null> {
  return read((await cookies()).get(ACTIVE_COOKIE)?.value, "active");
}

export async function setActiveMemberCookie(memberId: number) {
  (await cookies()).set(ACTIVE_COOKIE, await sign(memberId, "365d", "active"), { ...baseOpts, maxAge: 60 * 60 * 24 * 365 });
}

export async function clearActiveMemberCookie() {
  (await cookies()).delete(ACTIVE_COOKIE);
}

/** Prueba efímera (2 min) de que el PIN fue verificado para este miembro. */
export async function grantPinProof(memberId: number) {
  (await cookies()).set(PIN_PROOF_COOKIE, await sign(memberId, "2m", "pinproof"), { ...baseOpts, maxAge: 120 });
}

export async function hasPinProof(memberId: number): Promise<boolean> {
  return (await read((await cookies()).get(PIN_PROOF_COOKIE)?.value, "pinproof")) === memberId;
}

// ── Hash de PIN (scrypt con sal). Compatible con PIN antiguos en texto plano. ──
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function checkPin(stored: string, pin: string): { ok: boolean; legacy: boolean } {
  if (!stored.startsWith("scrypt$")) {
    const a = Buffer.from(stored), b = Buffer.from(pin);
    return { ok: a.length === b.length && timingSafeEqual(a, b), legacy: true };
  }
  const [, saltHex, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const got = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return { ok: timingSafeEqual(expected, got), legacy: false };
}

// ── Rate limit en memoria: 5 fallos / 15 min por clave, bloqueo 15 min ──
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const fails = new Map<string, { n: number; first: number }>();

export function isRateLimited(key: string): boolean {
  const e = fails.get(key);
  if (!e) return false;
  if (Date.now() - e.first > WINDOW_MS) { fails.delete(key); return false; }
  return e.n >= MAX_FAILS;
}
export function recordFailure(key: string) {
  const e = fails.get(key);
  if (!e || Date.now() - e.first > WINDOW_MS) fails.set(key, { n: 1, first: Date.now() });
  else e.n++;
}
export function resetFailures(key: string) { fails.delete(key); }
