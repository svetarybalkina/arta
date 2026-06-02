import { env } from "@/lib/env";

export const normalizePromo = (value: string) => value.trim().toLowerCase();

export const isPromoAllowed = (value: string) =>
  env.promoCodes.includes(normalizePromo(value));
