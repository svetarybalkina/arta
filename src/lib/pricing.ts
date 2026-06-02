export const generationPlans = [
  { title: "1 генерация", count: 1, basePrice: 24 },
  { title: "5 генераций", count: 5, basePrice: 100 },
  { title: "10 генераций", count: 10, basePrice: 150 },
];

export function calcPlanPrice(planCount: number, freeLeft: number, promoApplied: boolean, promoPricingActive: boolean) {
  if (!promoApplied || !promoPricingActive) return null;
  const paidCount = Math.max(planCount - freeLeft, 0);
  return paidCount * 12;
}

