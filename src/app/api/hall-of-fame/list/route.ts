import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hallSeedCards } from "@/lib/hall-seed";

export async function GET() {
  try {
    const manual = await db.listHallManual();
    if (manual.length > 0) {
      return NextResponse.json({ items: manual.map((m) => ({ src: m.image_url, label: "" })) });
    }

    const recent = await db.listHallRecent(7);
    const dynamicCount = Math.min(recent.length, 7);
    const seedPart = hallSeedCards.slice(dynamicCount);
    const dynamicPart = recent.map((item) => ({ src: item.image_url, label: "" }));
    return NextResponse.json({ items: [...seedPart, ...dynamicPart] });
  } catch (error) {
    console.error("Failed to load hall of fame entries", error);
    return NextResponse.json({ items: hallSeedCards });
  }
}
