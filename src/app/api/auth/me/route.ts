import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null, profile: { generations_left: 0, promo_applied: 0 } });
  }
  const profile = (await db.getProfile(user.id)) ?? (await db.ensureProfile(user.id));
  return NextResponse.json({ user: { id: user.id, email: user.email, is_admin: user.is_admin }, profile });
}
