import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { generationService } from "@/lib/generation-service";
import { stylePresetMap } from "@/lib/style-presets";
import { polzaClient } from "@/lib/polza-client";
import { db } from "@/lib/db";
import { readGuestPromo, setGuestPromoLeft } from "@/lib/guest-promo";

const schema = z.object({
  styleId: z.string(),
  sourceImageBase64: z.string().min(100),
  animeWithStars: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    const payload = schema.parse(await request.json());
    const style = stylePresetMap.get(payload.styleId);
    if (!style) {
      return NextResponse.json({ error: "INVALID_STYLE" }, { status: 400 });
    }

    let generationOwnerId: string | null = null;
    const isAdmin = user?.is_admin === 1;

    if (user) {
      if (!isAdmin && !(await generationService.canGenerate(user.id))) {
        return NextResponse.json({ error: "NO_GENERATIONS_LEFT" }, { status: 400 });
      }
      if (!isAdmin) {
        await generationService.consumeGeneration(user.id);
      }
      generationOwnerId = user.id;
    } else {
      const guestPromo = await readGuestPromo();
      if (guestPromo.freeLeft <= 0) {
        return NextResponse.json({ error: "NO_GENERATIONS_LEFT" }, { status: 400 });
      }
      await setGuestPromoLeft(guestPromo.freeLeft - 1);
    }

    try {
      const result = await polzaClient.generateStyledImage({
        sourceImageBase64: payload.sourceImageBase64,
        stylePrompt: style.getPrompt({ animeWithStars: payload.animeWithStars }),
      });

      if (result.resultUrl) {
        if (!generationOwnerId) return NextResponse.json({ generationId: null, resultUrl: result.resultUrl });
        const generationId = await db.insertGeneration(generationOwnerId, payload.styleId, result.resultUrl);
        return NextResponse.json({ generationId, resultUrl: result.resultUrl });
      }

      const localDataUrl = `data:image/jpeg;base64,${result.resultBase64 ?? ""}`;
      if (!generationOwnerId) return NextResponse.json({ generationId: null, resultUrl: localDataUrl });
      const generationId = await db.insertGeneration(generationOwnerId, payload.styleId, localDataUrl);
      return NextResponse.json({ generationId, resultUrl: localDataUrl });
    } catch (error) {
      if (user && !isAdmin) {
        await generationService.rollbackGeneration(user.id);
      } else {
        const guestPromo = await readGuestPromo();
        await setGuestPromoLeft(guestPromo.freeLeft + 1);
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

