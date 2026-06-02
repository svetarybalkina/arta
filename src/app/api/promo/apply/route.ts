import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isPromoAllowed } from "@/lib/promo";
import { generationService } from "@/lib/generation-service";

const schema = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const payload = schema.parse(await request.json());
    if (!isPromoAllowed(payload.code)) {
      return NextResponse.json({ error: "PROMO_INVALID" }, { status: 400 });
    }

    await generationService.applyPromo(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

