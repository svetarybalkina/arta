"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentTestPage() {
  const router = useRouter();
  const [count] = useState(() => {
    if (typeof window === "undefined") return 0;
    const queryCount = Number(new URLSearchParams(window.location.search).get("count") ?? "0");
    return Number.isFinite(queryCount) ? queryCount : 0;
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const pay = async () => {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/payments/test/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    const json = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setMessage(json.error ?? "Ошибка оплаты");
      return;
    }
    router.push("/");
  };

  return (
    <main className="mx-auto mt-20 w-full max-w-lg rounded-2xl border border-[#6f7d68] bg-[#1f2e1f]/92 p-6 text-[#f0e6c8]">
      <h1 className="text-2xl font-bold">Тестовая оплата</h1>
      <p className="mt-2">Пакет: {count} генераций</p>
      <p className="mt-1 text-sm text-[#d8d0af]">Это заглушка для тестирования сценария оплаты.</p>
      {message && <p className="mt-3 text-sm">{message}</p>}
      <button className="btn-military mt-5" onClick={pay} disabled={loading || count <= 0}>
        {loading ? "Подождите..." : "Оплатить (тест)"}
      </button>
    </main>
  );
}
