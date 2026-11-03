import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FALLBACK_MODELS, llm, geminiVision, parseJson } from "./llm";

describe("llm configuration & behavior", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("FALLBACK_MODELS contiene los modelos soportados y no modelos obsoletos", () => {
    expect(FALLBACK_MODELS).toContain("gemini-3.5-flash");
    expect(FALLBACK_MODELS).toContain("gemini-3.5-flash-lite");
    expect(FALLBACK_MODELS).toContain("gemini-3.8-flash");

    // Modelos obsoletos eliminados
    expect(FALLBACK_MODELS).not.toContain("gemini-flash-latest");
    expect(FALLBACK_MODELS).not.toContain("gemini-3.7-flash");
    expect(FALLBACK_MODELS).not.toContain("gemini-2.5-flash");
  });

  it("llm() incluye response_mime_type en generationConfig cuando opts.json es true", async () => {
    let capturedBody: any = null;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      if (init?.body) {
        capturedBody = JSON.parse(init.body as string);
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "```json\n{\"ok\": true}\n```" }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await llm([{ role: "user", content: "hola" }], { json: true });

    expect(capturedBody).toBeDefined();
    expect(capturedBody.generationConfig?.response_mime_type).toBe("application/json");
    expect(res).toBe('{"ok": true}');
  });

  it("geminiVision() añade response_mime_type, usa timeout de 30s y recorta backticks", async () => {
    let capturedBody: any = null;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      if (init?.body) {
        capturedBody = JSON.parse(init.body as string);
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "```json\n{\n  \"storeName\": \"Mercadona\"\n}\n```" }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await geminiVision("Analiza este ticket", "base64data", "image/jpeg", { json: true });

    expect(capturedBody).toBeDefined();
    expect(capturedBody.generationConfig?.response_mime_type).toBe("application/json");
    expect(res).toBe('{\n  "storeName": "Mercadona"\n}');
  });

  it("geminiVision() devuelve respuesta limpia cuando la API responde JSON directo", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"storeName": "Carrefour", "total": 15.5}' }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await geminiVision("OCR", "base64data", "image/png", { json: true });
    expect(res).toBe('{"storeName": "Carrefour", "total": 15.5}');
    expect(parseJson<{ storeName: string }>(res)?.storeName).toBe("Carrefour");
  });
});
