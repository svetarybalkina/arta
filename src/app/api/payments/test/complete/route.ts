import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { generationService } from "@/lib/generation-service";

const schema = z.object({
  count: z.number().int().positive(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const payload = schema.parse(await request.json());
  const profile = await generationService.ensureProfile(user.id);
  await generationService.updateBalance(user.id, profile.generations_left + payload.count);
  return NextResponse.json({ ok: true });
}

