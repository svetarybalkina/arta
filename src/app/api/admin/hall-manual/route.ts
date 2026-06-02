import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  items: z.array(z.object({ image_url: z.string().min(1) })).min(1).max(7),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.is_admin !== 1) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const items = await db.listHallManual();
  return NextResponse.json({ items: items.map((x) => ({ id: x.id, image_url: x.image_url, position: x.position })) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.is_admin !== 1) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const payload = schema.parse(await request.json());
  await db.replaceHallManual(payload.items.map((item, idx) => ({ image_url: item.image_url, position: idx })));
  return NextResponse.json({ ok: true });
}
