import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const seed = [
  { src: "/hall-seed/hof-1.jpg", label: "" },
  { src: "/hall-seed/custom-doll.png", label: "" },
  { src: "/hall-seed/custom-anime.jpg", label: "" },
  { src: "/hall-seed/hof-4.jpg", label: "" },
  { src: "/hall-seed/custom-valejo.png", label: "" },
  { src: "/hall-seed/hof-6.jpg", label: "" },
  { src: "/hall-seed/hof-7.png", label: "" },
];

export async function GET() {
  const manual = await db.listHallManual();
  if (manual.length > 0) {
    return NextResponse.json({ items: manual.map((m) => ({ src: m.image_url, label: "" })) });
  }

  const recent = await db.listHallRecent(7);
  const dynamicCount = Math.min(recent.length, 7);
  const seedPart = seed.slice(dynamicCount);
  const dynamicPart = recent.map((item) => ({ src: item.image_url, label: "" }));
  return NextResponse.json({ items: [...seedPart, ...dynamicPart] });
}
