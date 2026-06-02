import { cookies } from "next/headers";

const GUEST_PROMO_APPLIED = "guest_promo_applied";
const GUEST_PROMO_LEFT = "guest_promo_left";
const maxAge = 60 * 60 * 24 * 90;

export async function readGuestPromo() {
  const store = await cookies();
  const promoApplied = store.get(GUEST_PROMO_APPLIED)?.value === "1";
  const freeLeftRaw = Number(store.get(GUEST_PROMO_LEFT)?.value ?? "0");
  const freeLeft = Number.isFinite(freeLeftRaw) ? Math.max(0, freeLeftRaw) : 0;
  return { promoApplied, freeLeft };
}

export async function setGuestPromo(freeLeft: number) {
  const store = await cookies();
  store.set(GUEST_PROMO_APPLIED, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge });
  store.set(GUEST_PROMO_LEFT, String(Math.max(0, freeLeft)), { httpOnly: true, sameSite: "lax", path: "/", maxAge });
}

export async function setGuestPromoLeft(freeLeft: number) {
  const store = await cookies();
  store.set(GUEST_PROMO_LEFT, String(Math.max(0, freeLeft)), { httpOnly: true, sameSite: "lax", path: "/", maxAge });
}

