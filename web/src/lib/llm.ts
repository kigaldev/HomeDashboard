import "server-only";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const FALLBACK_MODELS = Array.from(
  new Set([DEFAULT_MODEL, "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.7-flash", "gemini-3.8-flash"])
);

const LOCAL_BASE = (process.env.LLM_BASE_URL || "").replace(/\/$/, "");
const LOCAL_MODEL = process.env.LLM_MODEL || "qwen3-8b";

/**
 * Cliente LLM unificado con soporte nativo prioritario para Google Gemini
 * y fallback automático a modelos alternativos y servidor local.
 */
export async function llm(
  messages: ChatMsg[],
  opts: { timeoutMs?: number; temperature?: number; json?: boolean } = {},
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || GEMINI_KEY;

  // 1. Prioridad: Google Gemini API (Rápido, oficial, multimodal)
  if (apiKey) {
    const systemMsg = messages.find((m) => m.role === "system");
    const conversationMsgs = messages.filter((m) => m.role !== "system");

    const contents = conversationMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0 && systemMsg) {
      contents.push({ role: "user", parts: [{ text: systemMsg.content }] });
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
      },
    };

    if (systemMsg) {
      body.system_instruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    for (const model of FALLBACK_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
          cache: "no-store",
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[Gemini API ${model} error ${res.status}]:`, errText.slice(0, 160));
          // Si el modelo está ocupado (503) o con rate-limit (429), reintenta con el siguiente modelo
          if (res.status === 503 || res.status === 429 || res.status === 404) {
            continue;
          }
          return null;
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;

        if (opts.json) {
          return text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
        }
        return text.trim();
      } catch (err: any) {
        console.warn(`[llm - Gemini ${model} error]:`, err?.message || err);
      }
    }
  }

  // 2. Fallback: LLM Local OpenAI-compatible
  if (LOCAL_BASE) {
    try {
      const res = await fetch(`${LOCAL_BASE}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: LOCAL_MODEL,
          messages,
          temperature: opts.temperature ?? 0.6,
          stream: false,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const j = await res.json();
      const text: string | undefined = j.choices?.[0]?.message?.content;
      if (!text) return null;
      return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Procesa imágenes directamente con Gemini Vision (Tickets de compra, recetas, etc.)
 */
export async function geminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  opts: { json?: boolean } = {},
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || GEMINI_KEY;
  if (!apiKey) {
    console.error("[geminiVision]: GEMINI_API_KEY no está configurada en las variables de entorno.");
    throw new Error(
      "GEMINI_API_KEY no está configurada en las variables de entorno del servidor (Vercel). Añade GEMINI_API_KEY en Vercel > Settings > Environment Variables."
    );
  }

  const safeMimeType = (mimeType && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType.toLowerCase()))
    ? mimeType.toLowerCase()
    : "image/jpeg";
  const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: safeMimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  };

  for (const model of FALLBACK_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(18_000),
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.text();
        console.warn(`[Gemini Vision ${model} error ${res.status}]:`, err.slice(0, 160));
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      if (opts.json) {
        return text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      }
      return text.trim();
    } catch (err: any) {
      console.warn(`[geminiVision ${model} error]:`, err?.message || err);
    }
  }

  return null;
}

export async function llmStatus(): Promise<{ online: boolean; provider: string; model: string }> {
  if (GEMINI_KEY) {
    return { online: true, provider: "Google Gemini", model: DEFAULT_MODEL };
  }
  if (LOCAL_BASE) {
    try {
      const res = await fetch(`${LOCAL_BASE}/models`, { signal: AbortSignal.timeout(2000), cache: "no-store" });
      return { online: res.ok, provider: "Local LLM", model: LOCAL_MODEL };
    } catch {
      return { online: false, provider: "Local LLM", model: LOCAL_MODEL };
    }
  }
  return { online: false, provider: "Ninguno (Modo Plantillas)", model: "None" };
}

/** Extrae el primer objeto JSON de una respuesta de texto. */
export function parseJson<T>(text: string | null): T | null {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}
