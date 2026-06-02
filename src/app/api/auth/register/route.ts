import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { env } from "@/lib/env";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  acceptedOffer: z.literal(true),
  acceptedPrivacy: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    if (await db.findUserByEmail(payload.email)) {
      return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const user = await db.createUser(payload.email, hashPassword(payload.password), now, now);
    if (env.adminEmail && payload.email.toLowerCase() === env.adminEmail) {
      await db.setUserAdmin(user.id, true);
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "UNKNOWN_ERROR" }, { status: 500 });
  }
}
