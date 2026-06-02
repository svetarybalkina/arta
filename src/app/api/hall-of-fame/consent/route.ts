import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  generationId: z.string().uuid(),
  consent: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload = schema.parse(await request.json());
    const generation = await db.findGenerationById(payload.generationId);
    if (!generation) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (generation.user_id !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await db.setGenerationHallConsent(payload.generationId, payload.consent);

    if (!payload.consent) return NextResponse.json({ ok: true });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.insertHall(user.id, generation.id, generation.result_url, expiresAt);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
