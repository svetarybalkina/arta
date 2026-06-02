"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Me = { user: { email: string; is_admin: number } | null };

type Item = { image_url: string };

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const me = (await meRes.json()) as Me;
    if (!me.user || me.user.is_admin !== 1) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(true);
    const res = await fetch("/api/admin/hall-manual", { cache: "no-store" });
    const json = (await res.json()) as { items?: Array<{ image_url: string }> };
    if (res.ok && json.items) setItems(json.items.map((x) => ({ image_url: x.image_url })));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const onUpload = (file: File, idx: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setItems((prev) => {
        const next = [...prev];
        if (next[idx]) next[idx] = { image_url: data };
        else next.push({ image_url: data });
        return next.slice(0, 7);
      });
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!items.length) {
      setMessage("Добавьте хотя бы одну карточку.");
      return;
    }
    const res = await fetch("/api/admin/hall-manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setMessage(res.ok ? "Сохранено." : "Ошибка сохранения.");
  };

  const onDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  if (!isAdmin) {
    return <main className="mx-auto mt-10 max-w-3xl p-4 text-[#2f3828]">Доступ только для администратора.</main>;
  }

  return (
    <main className="mx-auto mt-8 max-w-5xl p-4 text-[#2f3828]">
      <h1 className="text-3xl font-bold">Админ: Доска почета</h1>
      <p className="mt-2 text-sm">Перетаскивайте карточки для смены порядка и загружайте новые изображения.</p>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: Math.max(7, items.length || 7) }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-[#6d7f65] bg-[#273527] p-2"
            draggable={Boolean(items[idx])}
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(idx)}
          >
            {items[idx] ? (
              <div className="aspect-[9/16] overflow-hidden rounded-md bg-[#f2f2e8]">
                <Image src={items[idx].image_url} alt={`slot-${idx}`} width={220} height={390} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center rounded-md border border-dashed border-[#8a9370] bg-[#1f2e1f] text-xs text-[#c9cfb2]">Пусто</div>
            )}
            <label className="btn-muted mt-2 block cursor-pointer text-center text-xs">
              Загрузить
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, idx); }} />
            </label>
          </div>
        ))}
      </div>
      {message && <p className="mt-3 text-sm">{message}</p>}
      <button className="btn-military mt-4" onClick={save}>Сохранить доску</button>
    </main>
  );
}
