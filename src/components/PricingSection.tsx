import { env } from "@/lib/env";
import { calcPlanPrice, generationPlans } from "@/lib/pricing";

export function PricingSection({
  promoApplied,
  freeLeft,
  highlighted,
  onSelectPlan,
}: {
  promoApplied: boolean;
  freeLeft: number;
  highlighted?: boolean;
  onSelectPlan: (count: number) => void;
}) {
  const plans = generationPlans.map((plan) => {
    const promoPrice = calcPlanPrice(plan.count, freeLeft, promoApplied, env.promoPricingActive);
    return { ...plan, promoPrice, price: `${promoPrice ?? plan.basePrice} ₽` };
  });

  return (
    <section id="pricing" className="mt-12 scroll-mt-20">
      <h2 className="text-2xl font-bold text-[#2f3828]">Пакеты генераций</h2>
      <div
        className={`mt-4 rounded-2xl p-2 transition ${
          highlighted ? "ring-4 ring-[#d7be65]/70" : ""
        }`}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.title} className="rounded-xl border border-[#6d7f65] bg-[#273527] p-4">
              <h3 className="text-lg text-[#d7dfc2]">{plan.title}</h3>
              <p className="mt-1 text-2xl font-bold text-[#edf3dd]">{plan.price}</p>
              <button className="btn-military mt-4 w-full" onClick={() => onSelectPlan(plan.count)}>
                Оплатить
              </button>
            </div>
          ))}
        </div>
      </div>
      {promoApplied && env.promoPricingActive && (
        <p className="mt-2 text-sm text-[#4d543f]">
          Для вас действует промо: первые {freeLeft} генерации бесплатно, далее 12 ? за генерацию.
        </p>
      )}
    </section>
  );
}

