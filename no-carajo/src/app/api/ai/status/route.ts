import { NextResponse } from "next/server";
import { AI_MODEL, aiEnabled } from "@/lib/server/ai";
import { remainingToday } from "@/lib/server/limits";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ enabled: aiEnabled(), model: aiEnabled() ? AI_MODEL : undefined, remainingToday: remainingToday() });
}
