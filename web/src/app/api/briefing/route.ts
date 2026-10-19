import { NextResponse } from "next/server";
import { generateBriefing, type BriefingKind } from "@/lib/briefing";
import { getLatestBriefing } from "@/lib/repo";

export async function GET() {
  const latest = await getLatestBriefing();
  return NextResponse.json({ briefing: latest });
}

export async function POST(req: Request) {
  try {
    const { kind } = (await req.json().catch(() => ({}))) as { kind?: BriefingKind };
    const validKind: BriefingKind = kind === "evening" ? "evening" : "morning";
    const content = await generateBriefing(validKind);
    return NextResponse.json({ success: true, kind: validKind, content });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
