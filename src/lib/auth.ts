import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const SESSION_COOKIE = "arta_session";

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, encoded: string) => {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
};

const signToken = (token: string) =>
  createHmac("sha256", env.sessionSecret).update(token).digest("hex");

const packToken = (token: string) => `${token}.${signToken(token)}`;

const unpackToken = (value: string | undefined) => {
  if (!value) return null;
  const [token, signature] = value.split(".");
  if (!token || !signature) return null;
  if (signToken(token) !== signature) return null;
  return token;
};

export const createSession = async (userId: string) => {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const raw = await db.createSession(userId, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, packToken(raw), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(expiresAt),
  });
};

export const clearSession = async () => {
  const cookieStore = await cookies();
  const raw = unpackToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (raw) await db.deleteSession(raw);
  cookieStore.delete(SESSION_COOKIE);
};

export const getSessionUser = async () => {
  const cookieStore = await cookies();
  const raw = unpackToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!raw) return null;
  return db.getSessionUser(raw);
};
