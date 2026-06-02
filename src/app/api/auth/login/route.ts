import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { env } from "@/lib/env";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const email = payload.email.toLowerCase();

    if (env.adminEmail && env.adminPassword && email === env.adminEmail && payload.password === env.adminPassword) {
      let user = await db.findUserByEmail(email);
      if (!user) {
        const now = new Date().toISOString();
        user = await db.createUser(email, hashPassword(payload.password), now, now);
      }
      await db.setUserAdmin(user.id, true);
      await createSession(user.id);
      return NextResponse.json({ ok: true });
    }

    const user = await db.findUserByEmail(email);
    if (!user || !verifyPassword(payload.password, user.password_hash)) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "UNKNOWN_ERROR" }, { status: 500 });
  }
}
