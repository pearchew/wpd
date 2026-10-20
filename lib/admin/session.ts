import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminUsers, devUser } from "./config";

export const SESSION_COOKIE = "wdp_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // two weeks

export interface Session {
  login: string;
  /** GitHub user id, for the noreply commit email */
  id: number;
  name: string;
  initials: string;
  exp: number;
}

const secret = () => process.env.ADMIN_SESSION_SECRET ?? "";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(s: Omit<Session, "exp">): { value: string; maxAge: number } {
  const payload = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  return { value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE };
}

export function decodeSession(value: string | undefined): Session | undefined {
  if (!value || !secret()) return undefined;
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return undefined;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (s.exp < Date.now() / 1000) return undefined;
    // Re-check the allowlist so removing someone from ADMIN_USERS signs them out.
    const allowed = adminUsers().find((u) => u.login === s.login.toLowerCase());
    return allowed ? { ...s, initials: allowed.initials } : undefined;
  } catch {
    return undefined;
  }
}

export async function getSession(): Promise<Session | undefined> {
  const dev = devUser();
  if (dev) return { login: `dev-${dev.toLowerCase()}`, id: 0, name: `Dev user ${dev}`, initials: dev, exp: Infinity };
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For admin pages and server actions: signed-in team member, or off to the sign-in page. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/admin/sign-in");
  return s;
}
