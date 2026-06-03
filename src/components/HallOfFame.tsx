"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { hallSeedCards } from "@/lib/hall-seed";

const cardScatter = [
  { rotate: -7, mt: 12, mb: 4 },
  { rotate: 5, mt: 0, mb: 10 },
  { rotate: -4, mt: 16, mb: 0 },
  { rotate: 8, mt: 6, mb: 8 },
  { rotate: -6, mt: 14, mb: 2 },
  { rotate: 4, mt: 2, mb: 12 },
  { rotate: -3, mt: 10, mb: 6 },
];

export function HallOfFame({ refreshToken = 0 }: { refreshToken?: number }) {
  const [cards, setCards] = useState(hallSeedCards);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/hall-of-fame/list", { cache: "no-store" });
      const json = (await res.json()) as { items?: Array<{ src: string; label: string }> };
      if (res.ok && json.items?.length) setCards(json.items);
    };
    void load();
  }, [refreshToken]);

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-[#2f3828]">Доска почета</h2>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((card, idx) => {
          const scatter = cardScatter[idx % cardScatter.length];
          return (
            <div
              key={`${card.src}-${idx}`}
              className="clip-card-cartoon"
              style={{
                rotate: `${scatter.rotate}deg`,
                marginTop: `${scatter.mt}px`,
                marginBottom: `${scatter.mb}px`,
              }}
            >
              <div className="aspect-[9/16] overflow-hidden rounded-md bg-[#f2f2e8]">
                <Image src={card.src} alt={card.label} width={220} height={390} className="h-full w-full object-contain" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

