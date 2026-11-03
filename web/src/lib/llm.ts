import "server-only";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, any>;
    required?: string[];
  };
};

export type LLMToolCall = {
  id?: string;
  name: string;
  args: Record<string, any>;
  rawPart?: any;
};

export type LLMWithToolsResult = {
  text?: string;
  toolCalls?: LLMToolCall[];
};

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
export const FALLBACK_MODELS = Array.from(
  new Set([DEFAULT_MODEL, "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"])
);

function getCleanApiKey(): string {
  const k = process.env.GEMINI_API_KEY || GEMINI_KEY || "";
  return k.replace(/^"|"$/g, "").trim();
}

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
  const apiKey = getCleanApiKey();

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
        ...(opts.json ? { response_mime_type: "application/json" } : {}),
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
 * Cliente con soporte nativo de Function Calling / Tools para Google Gemini.
 * Permite que el modelo elija llamar a funciones de la app (agenda, tareas, compra, despensa)
 * con argumentos estructurados y fuertemente tipados.
 */
export async function llmWithTools(
  messages: ChatMsg[],
  tools: ToolDeclaration[],
  opts: { timeoutMs?: number; temperature?: number } = {},
): Promise<LLMWithToolsResult | null> {
  const apiKey = getCleanApiKey();
  if (!apiKey) return null;

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
      temperature: opts.temperature ?? 0.2,
    },
  };

  if (tools.length > 0) {
    body.tools = [{ functionDeclarations: tools }];
  }

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
        signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 503 || res.status === 429 || res.status === 404) continue;
        return null;
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      if (!candidate) continue;

      const parts = candidate.content?.parts || [];
      const toolCalls: LLMToolCall[] = [];
      let text: string | undefined;

      for (const part of parts) {
        if (part.functionCall) {
          toolCalls.push({
            id: part.functionCall.id,
            name: part.functionCall.name,
            args: part.functionCall.args || {},
            rawPart: part,
          });
        }
        if (part.text) {
          text = (text ? text + "\n" : "") + part.text.trim();
        }
      }

      return {
        text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (err: any) {
      console.warn(`[llmWithTools - Gemini ${model} error]:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Envía el resultado de la función ejecutada de vuelta a Gemini para que el modelo
 * genere su respuesta final conversacional (JARVIS) con todo el contexto.
 */
export async function llmToolFollowUp(
  messages: ChatMsg[],
  tools: ToolDeclaration[],
  rawPart: any,
  functionName: string,
  responseOutput: any,
  opts: { timeoutMs?: number; temperature?: number } = {},
): Promise<string | null> {
  const apiKey = getCleanApiKey();
  if (!apiKey || !rawPart) return null;

  const systemMsg = messages.find((m) => m.role === "system");
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  const contents: any[] = conversationMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Turno del modelo con la llamada a la función (incluyendo thoughtSignature de Gemini)
  contents.push({
    role: "model",
    parts: [rawPart],
  });

  // Turno del usuario/función con la respuesta de la función ejecutada
  contents.push({
    role: "user",
    parts: [
      {
        functionResponse: {
          name: functionName,
          response: {
            output: responseOutput,
          },
        },
      },
    ],
  });

  const body: any = {
    contents,
    tools: [{ functionDeclarations: tools }],
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
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
        cache: "no-store",
      });

      if (!res.ok) continue;

      const data = await res.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txt) return txt.trim();
    } catch {
      // Reintentar con siguiente modelo
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
  const apiKey = getCleanApiKey();
  if (!apiKey) {
    console.error("[geminiVision]: GEMINI_API_KEY no está configurada en las variables de entorno.");
    throw new Error(
      "GEMINI_API_KEY no está configurada en las variables de entorno del servidor (Vercel). Añade GEMINI_API_KEY en Vercel > Settings > Environment Variables."
    );
  }

  const safeMimeType = (mimeType && ["image/jpeg", "image/png", "image/webp"].includes(mimeType.toLowerCase()))
    ? mimeType.toLowerCase()
    : "image/jpeg";
  const cleanBase64 = (imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64)
    .trim()
    .replace(/\s+/g, "");

  const body: any = {
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
      ...(opts.json ? { response_mime_type: "application/json" } : {}),
    },
  };

  for (const model of FALLBACK_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
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
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonBlockMatch) {
          return jsonBlockMatch[1].trim();
        }
        return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
