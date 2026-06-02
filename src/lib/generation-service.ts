import { env } from "@/lib/env";
import { db } from "@/lib/db";

export const generationService = {
  async ensureProfile(userId: string) {
    return await db.ensureProfile(userId);
  },

  async canGenerate(userId: string) {
    const profile = await this.ensureProfile(userId);
    return profile.generations_left > 0;
  },

  async consumeGeneration(userId: string) {
    const profile = await this.ensureProfile(userId);
    if (profile.generations_left <= 0) {
      throw new Error("NO_GENERATIONS_LEFT");
    }
    const next = profile.generations_left - 1;
    await db.updateProfile(userId, { generations_left: next });
  },

  async rollbackGeneration(userId: string) {
    const profile = await this.ensureProfile(userId);
    await db.updateProfile(userId, { generations_left: profile.generations_left + 1 });
  },

  async updateBalance(userId: string, nextValue: number) {
    await db.updateProfile(userId, { generations_left: Math.max(0, nextValue) });
  },

  async applyPromo(userId: string) {
    const profile = await this.ensureProfile(userId);
    if (profile.promo_applied === 1) {
      throw new Error("PROMO_ALREADY_APPLIED");
    }
    await db.updateProfile(userId, {
      promo_applied: 1,
      generations_left: profile.generations_left + env.promoFreeGenerations,
    });
  },
};
