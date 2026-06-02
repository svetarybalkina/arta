"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { styleCatalog } from "@/lib/style-catalog";
import { AkLoader } from "@/components/AkLoader";

type UserState = { email?: string } | null;
type CropArea = { width: number; height: number; x: number; y: number };
type ProfilePayload = { promoApplied: boolean; freeLeft: number; balance: number; userEmail: string | null; isAdmin: boolean };

export function GenerationStudio({
  onNeedAuth,
  onNeedPricing,
  onHallUpdated,
  onProfileChange,
}: {
  onNeedAuth: () => void;
  onNeedPricing: () => void;
  onHallUpdated: () => void;
  onProfileChange: (payload: ProfilePayload) => void;
}) {
  const [user, setUser] = useState<UserState>(null);
  const [selectedStyle, setSelectedStyle] = useState(styleCatalog[0].id);
  const [sourcePreview, setSourcePreview] = useState("");
  const [sourceBase64, setSourceBase64] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [message, setMessage] = useState("");
  const [promo, setPromo] = useState("");
  const [showCropAsk, setShowCropAsk] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [showHallAsk, setShowHallAsk] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [animeWithStars, setAnimeWithStars] = useState<boolean>(true);
  const [showAnimePopup, setShowAnimePopup] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);

  const syncUser = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const json = (await response.json()) as {
      user: { email?: string; is_admin?: number } | null;
      profile?: { generations_left?: number; promo_applied?: number } | null;
    };
    setUser(json.user);
    onProfileChange({
      promoApplied: (json.profile?.promo_applied ?? 0) === 1,
      freeLeft: Math.min(json.profile?.generations_left ?? 0, 3),
      balance: Math.max(json.profile?.generations_left ?? 0, 0),
      userEmail: json.user?.email ?? null,
      isAdmin: (json.user?.is_admin ?? 0) === 1,
    });
  }, [onProfileChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncUser();
  }, [syncUser]);

  useEffect(() => {
    if (!user) return;
    const pendingPromo = localStorage.getItem("pending_promo_code");
    if (!pendingPromo) return;
    localStorage.removeItem("pending_promo_code");
    void (async () => {
      const response = await fetch("/api/promo/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pendingPromo }),
      });
      const json = (await response.json()) as { error?: string };
      setMessage(response.ok ? "Промокод применен: +3 генерации." : json.error ?? "Ошибка");
      await syncUser();
    })();
  }, [user, syncUser]);

  const selectedPreview = useMemo(() => {
    if (selectedStyle === "anime-force") {
      return animeWithStars ? "/style-previews/anime-stars.jpg" : "/style-previews/anime-clean.jpg";
    }
    return styleCatalog.find((s) => s.id === selectedStyle)?.previewImage ?? "";
  }, [selectedStyle, animeWithStars]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setSourcePreview(result);
      setSourceBase64(result.split(",")[1] ?? "");
      setResultUrl("");
      setShowCropAsk(false);
      setShowHallAsk(false);
      setDownloadReady(false);
    };
    reader.readAsDataURL(file);
  };

  const proceedGenerate = async (animeStars?: boolean) => {
    if (!sourceBase64) return setMessage("Сначала загрузите фото.");

    setIsGenerating(true);
    setMessage("");
    setDownloadReady(false);

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId: selectedStyle, sourceImageBase64: sourceBase64, animeWithStars: animeStars }),
      });

      const json = (await response.json()) as { error?: string; resultUrl?: string; generationId?: string | null };
      if (!response.ok) {
        if (json.error === "NO_GENERATIONS_LEFT") {
          onNeedPricing();
          throw new Error("Генерации закончились. Выберите пакет ниже.");
        }
        throw new Error(json.error ?? "Ошибка генерации");
      }

      setResultUrl(json.resultUrl ?? "");
      setGenerationId(json.generationId ?? "");
      setShowCropAsk(true);
      await syncUser();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setIsGenerating(false);
    }
  };

  const generate = async () => {
    await proceedGenerate(selectedStyle === "anime-force" ? animeWithStars : undefined);
  };

  const applyPromo = async () => {
    setMessage("");
    if (!promo.trim()) {
      setMessage("Введите промокод.");
      return;
    }
    if (!user) {
      localStorage.setItem("pending_promo_code", promo.trim());
      onNeedAuth();
      setMessage("Для применения промокода нужна регистрация или вход.");
      return;
    }
    const response = await fetch("/api/promo/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promo }),
    });
    const json = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Промокод применен: +3 генерации." : json.error ?? "Ошибка");
    await syncUser();
  };

  const sendHallConsent = async (consent: boolean) => {
    if (!generationId) {
      setShowHallAsk(false);
      setDownloadReady(true);
      return;
    }
    if (consent && !user) {
      onNeedAuth();
      setMessage("Чтобы добавить фото на Доску почета, войдите в аккаунт.");
      return;
    }
    await fetch("/api/hall-of-fame/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationId, consent }),
    });
    setShowHallAsk(false);
    setDownloadReady(true);
    if (consent) {
      setMessage("Фото отправлено на модерацию.");
      onHallUpdated();
    }
  };

  const onCropComplete = (_: unknown, areaPixels: CropArea) => setCropArea(areaPixels);

  return (
    <section className="mt-10 rounded-2xl border border-[#7b8a73] bg-[#1f2e1f]/92 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[#f1e6c7]">Стилизация фотографии</h2>
        <p className="text-sm text-[#d8d0af]">{user?.email ? `Вы: ${user.email}` : "Гость"}</p>
      </div>

      <div className="mt-4 grid items-stretch gap-4 md:grid-cols-2">
        <div className="flex h-full flex-col gap-4">
          <label className="panel flex flex-1 cursor-pointer flex-col items-center justify-center">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} />
            <p className="mb-3 text-center text-sm text-[#d8d0af]">Загрузите свое фото</p>
            {sourcePreview ? (
              <div className="aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-lg border border-[#73806c] bg-[#132114]">
                <Image src={sourcePreview} alt="source" width={500} height={900} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex aspect-[9/16] w-full max-w-[260px] items-center justify-center rounded-lg border border-dashed border-[#73806c] bg-[#132114]/40 text-center text-sm text-[#9fab95]">
                Выберите изображение
              </div>
            )}
          </label>

          <div className="rounded-lg border border-[#6a7a63] bg-[#1a281b] p-3 md:mt-auto">
            <p className="text-sm text-[#d8d0af]">Промокод</p>
            <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <input
                className="min-w-[180px] flex-1 rounded-lg border border-[#8fa07e] bg-[#d8ddc8] px-3 py-2 text-[#2f3828]"
                placeholder="Введите промокод"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
              />
              <button className="btn-muted self-center sm:self-auto" onClick={applyPromo}>
                Применить промокод
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <p className="text-[#efe6c6]">Выберите один стиль</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {styleCatalog.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  if (style.id === "anime-force") {
                    setSelectedStyle("anime-force");
                    setShowAnimePopup(true);
                    return;
                  }
                  setSelectedStyle(style.id);
                }}
                className={`rounded-lg border p-1 ${selectedStyle === style.id ? "border-[#dbc165]" : "border-[#63735e]"}`}
              >
                <div className="mx-auto aspect-[9/16] w-full max-w-[120px] overflow-hidden rounded-md bg-[#152516]">
                  <Image src={style.previewImage} alt={style.title} width={180} height={320} className="h-full w-full object-contain" />
                </div>
                <span className="mt-1 block text-xs text-[#efe6c6]">{style.title}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-[#5e6d58] p-2">
            <p className="text-xs text-[#e6ddb9]">Превью выбранного стиля</p>
            <div className="mx-auto mt-1 aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-md bg-[#132114]">
              <Image src={selectedPreview} alt="preview" width={400} height={720} className="h-full w-full object-contain" />
            </div>
            <div className="mt-3 flex justify-center">
              <button className="btn-military" onClick={generate} disabled={isGenerating}>
                Вот так хочу!
              </button>
            </div>
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="mt-4">
          <AkLoader />
        </div>
      )}
      {message && <p className="mt-3 text-sm text-[#e7dfbe]">{message}</p>}

      {resultUrl && (
        <div className="mt-5 rounded-xl border border-[#6f7f68] bg-[#1c2a1d] p-4">
          <div className="mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-lg border border-[#73806c] bg-[#101a11]">
            <Image src={resultUrl} alt="result" width={700} height={1200} className="h-full w-full object-contain" />
          </div>

          {showCropAsk && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-[#e7dfbe]">Я могу обрезать сразу под аватарку. Хочешь?</p>
              <button className="btn-military" onClick={() => { setShowCropAsk(false); setShowCropper(true); }}>Да</button>
              <button className="btn-muted" onClick={() => { setShowCropAsk(false); setShowHallAsk(true); }}>Нет</button>
            </div>
          )}

          {showCropper && (
            <div className="mt-4">
              <div className="relative h-72 overflow-hidden rounded-lg border border-[#617259]">
                <Cropper image={resultUrl} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                <button
                  className="btn-military"
                  onClick={() => {
                    if (!cropArea) return;
                    setShowCropper(false);
                    setShowHallAsk(true);
                  }}
                >
                  Применить 1:1
                </button>
              </div>
            </div>
          )}

          {showHallAsk && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-[#e7dfbe]">Добавить на Доску почета, чтобы все видели?</p>
              <button className="btn-military" onClick={() => void sendHallConsent(true)}>Да</button>
              <button className="btn-muted" onClick={() => void sendHallConsent(false)}>Нет, не надо</button>
            </div>
          )}

          {downloadReady && (
            <a className="btn-military mt-4 inline-block" href={resultUrl} download>
              Скачать
            </a>
          )}
        </div>
      )}

      {showAnimePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#fff3be] bg-[radial-gradient(circle_at_20%_20%,#fff3a8,transparent_30%),radial-gradient(circle_at_80%_25%,#c7f5ff,transparent_28%),radial-gradient(circle_at_35%_80%,#ffd2f8,transparent_36%),linear-gradient(135deg,#ffe9f7,#e7f5ff_45%,#f6f0ff)] p-4 shadow-[0_12px_40px_rgba(0,0,0,.35)]">
            <div className="rounded-xl border border-[#f7c8ff] bg-white/55 p-3">
              <p className="text-[20px] leading-tight text-[#5a4a6f]" style={{ fontFamily: "Comic Sans MS, Comic Sans, cursive" }}>
                Добавить звездочек и сияние?
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button className="rounded-lg border border-[#7e679f] bg-[#efe0ff] px-3 py-2 text-[#4f3f68]" onClick={() => { setAnimeWithStars(true); setShowAnimePopup(false); }}>
                  ✨🪄 Да
                </button>
                <button className="rounded-lg border border-[#8b8fa0] bg-[#f3f4f7] px-3 py-2 text-[#535867]" onClick={() => { setAnimeWithStars(false); setShowAnimePopup(false); }}>
                  Пожалуй, не надо
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
