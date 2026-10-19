import { NextResponse } from "next/server";
import { askAssistant } from "@/lib/assistant";
import { type ChatMsg } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const { message, history } = (await req.json()) as { message?: string; history?: ChatMsg[] };
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }
    const reply = await askAssistant(message, history || []);
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
