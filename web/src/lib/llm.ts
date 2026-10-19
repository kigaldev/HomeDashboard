import "server-only";

/**
 * Cliente para un LLM local con API compatible OpenAI
 * (LM Studio / llama.cpp server / Ollama en el PC servidor).
 * Si no está disponible, devuelve null y el resto del sistema usa plantillas.
 */
export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const BASE = (process.env.LLM_BASE_URL || "http://localhost:1234/v1").replace(/\/$/, "");
const MODEL = process.env.LLM_MODEL || "qwen3-8b";

export async function llm(messages: ChatMsg[], opts: { timeoutMs?: number; temperature?: number; json?: boolean } = {}): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: opts.temperature ?? 0.6,
        stream: false,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text: string | undefined = j.choices?.[0]?.message?.content;
    if (!text) return null;
    // Los modelos "thinking" (Qwen3…) pueden incluir su razonamiento: lo quitamos
    return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  } catch {
    return null;
  }
}

export async function llmStatus(): Promise<{ online: boolean; model: string }> {
  try {
    const res = await fetch(`${BASE}/models`, { signal: AbortSignal.timeout(2500), cache: "no-store" });
    return { online: res.ok, model: MODEL };
  } catch {
    return { online: false, model: MODEL };
  }
}

/** Extrae el primer objeto JSON de una respuesta de texto. */
export function parseJson<T>(text: string | null): T | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}
