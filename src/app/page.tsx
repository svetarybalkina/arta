"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/AuthModal";
import { HallOfFame } from "@/components/HallOfFame";
import { PricingSection } from "@/components/PricingSection";
import { GenerationStudio } from "@/components/GenerationStudio";

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [freeLeft, setFreeLeft] = useState(0);
  const [balance, setBalance] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [highlightPricing, setHighlightPricing] = useState(false);
  const [hallRefreshToken, setHallRefreshToken] = useState(0);
  const router = useRouter();
  const pricingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusPricing = () => {
    const block = document.getElementById("pricing");
    block?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightPricing(true);
    if (pricingTimer.current) clearTimeout(pricingTimer.current);
    pricingTimer.current = setTimeout(() => setHighlightPricing(false), 1700);
  };

  const handleSelectPlan = (count: number) => {
    localStorage.setItem("pending_plan_count", String(count));
    if (!userEmail) {
      setAuthOpen(true);
      return;
    }
    router.push(`/payment-test?count=${count}`);
  };

  useEffect(() => {
    if (!userEmail) return;
    const pendingPlan = Number(localStorage.getItem("pending_plan_count") ?? "0");
    if (pendingPlan > 0) {
      localStorage.removeItem("pending_plan_count");
      router.push(`/payment-test?count=${pendingPlan}`);
    }
  }, [userEmail, router]);

  return (
    <div className="min-h-screen bg-camo px-4 py-6 text-[#2f3828]">
      <main className="mx-auto w-full max-w-6xl">
        <section className="hero rounded-2xl border border-[#6f7d68] p-6 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-logo-hand mt-2 text-5xl leading-tight text-[#394231] md:text-7xl">АРТа</h1>
              <p className="mt-1 text-xs tracking-[0.14em] text-[#8e9578]">любимая твоя</p>
              <p className="mt-3 max-w-xl text-lg text-[#46503d]">Создай прикольное фото в мультипликационном стиле</p>
            </div>
            <div className="text-right">
              {userEmail ? <p className="text-sm font-semibold text-[#46503d]">Баланс: {balance}</p> : null}
              {isAdmin ? <Link href="/admin" className="text-sm underline">Админ-панель</Link> : null}
            </div>
          </div>
          <button className="btn-military mt-6" onClick={() => setAuthOpen(true)}>
            Регистрация / Вход
          </button>
        </section>

        <HallOfFame refreshToken={hallRefreshToken} />
        <GenerationStudio
          onNeedAuth={() => setAuthOpen(true)}
          onNeedPricing={focusPricing}
          onHallUpdated={() => setHallRefreshToken((v) => v + 1)}
          onProfileChange={(payload) => {
            setPromoApplied(payload.promoApplied);
            setFreeLeft(payload.freeLeft);
            setBalance(payload.balance);
            setUserEmail(payload.userEmail);
            setIsAdmin(payload.isAdmin);
          }}
        />
        <PricingSection promoApplied={promoApplied} freeLeft={freeLeft} highlighted={highlightPricing} onSelectPlan={handleSelectPlan} />
      </main>

      <footer className="mx-auto mt-8 w-full max-w-6xl border-t border-[#97a287] pt-4 text-sm text-[#4c5641]">
        <div className="flex flex-wrap gap-4">
          <Link href="/oferta" className="underline">Публичная оферта</Link>
          <Link href="/privacy" className="underline">Политика конфиденциальности</Link>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthSuccess={() => window.location.reload()} />
    </div>
  );
}
