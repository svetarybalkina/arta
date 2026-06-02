"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
};

export function AuthModal({ open, onClose, onAuthSuccess }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setLoading(true);
    setMessage("");
    const body: Record<string, unknown> = { email, password };
    if (!isLogin) {
      if (!acceptedOffer || !acceptedPrivacy) {
        setLoading(false);
        setMessage("Нужно принять оферту и политику конфиденциальности.");
        return;
      }
      body.acceptedOffer = true;
      body.acceptedPrivacy = true;
    }

    const response = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setMessage(json.error ?? "Ошибка авторизации");
      return;
    }
    setMessage(isLogin ? "Вход выполнен" : "Регистрация успешна");
    onClose();
    onAuthSuccess?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#76866f] bg-[#1f2a1f] p-6 shadow-[0_0_50px_rgba(0,0,0,.4)]">
        <h3 className="text-2xl font-bold text-[#f2e7c8]">{isLogin ? "Авторизация" : "Регистрация"}</h3>
        <p className="mt-1 text-sm text-[#c6cfb9]">Вход обязателен перед оплатой и добавлением на доску почета.</p>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-lg border border-[#5b6b57] bg-[#2a3829] px-3 py-2 text-[#efe5cb] outline-none" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-lg border border-[#5b6b57] bg-[#2a3829] px-3 py-2 text-[#efe5cb] outline-none" placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {!isLogin && (
          <div className="mt-4 space-y-2 text-sm text-[#d8d0af]">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={acceptedOffer} onChange={(e) => setAcceptedOffer(e.target.checked)} className="mt-1" />
              <span>
                Я принимаю условия <Link href="/oferta" className="underline">публичной оферты</Link>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} className="mt-1" />
              <span>
                Я согласен с <Link href="/privacy" className="underline">политикой конфиденциальности</Link>
              </span>
            </label>
          </div>
        )}

        {message && <p className="mt-3 text-sm text-[#dfd6bb]">{message}</p>}
        <div className="mt-5 flex gap-2">
          <button className="btn-military flex-1" disabled={loading} onClick={submit}>
            {loading ? "Подождите..." : isLogin ? "Войти" : "Создать аккаунт"}
          </button>
          <button className="btn-muted" onClick={onClose}>Закрыть</button>
        </div>
        <button className="mt-3 text-sm text-[#d8ca9e] underline" onClick={() => setIsLogin((v) => !v)}>
          {isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}
