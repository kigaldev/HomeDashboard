import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { handleBotMessage, handleBotPhoto, handleBotDocument } from "@/lib/bot";
import { q } from "@/lib/db";

export const maxDuration = 60;

const RAW_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TOKEN = RAW_TOKEN.trim().replace(/^["']|["']$/g, "").replace(/^bot/i, "").trim();
const ALLOWED = (process.env.TELEGRAM_ALLOWED_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function tgSend(chatId: string | number, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN vacío" };
  try {
    // 1. Intento primario con formato HTML
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    if (res.ok) return { ok: true };

    const errJson = await res.json().catch(() => null);
    const errDesc = errJson?.description || `HTTP ${res.status}`;
    console.warn("[api/telegram] Falló envío HTML:", errDesc);

    // Si es error de autenticación/token (401/404), no reintentar
    if (res.status === 401 || res.status === 404) {
      return { ok: false, error: `Telegram ${res.status}: ${errDesc}` };
    }

    // 2. Si Telegram rechaza el parseo HTML (error 400), reintentar en texto plano limpio
    const cleanText = text.replace(/<[^>]*>/g, "");
    const res2 = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: cleanText }),
    });
    if (res2.ok) return { ok: true };
    const err2 = await res2.json().catch(() => null);
    return { ok: false, error: err2?.description || `HTTP ${res2.status}` };
  } catch (err: any) {
    console.error("[api/telegram] Error enviando mensaje a Telegram:", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

async function tgSendAction(chatId: string | number, action: string = "typing") {
  if (!TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {
    // Ignore action errors
  }
}

/**
 * GET /api/telegram
 * Diagnóstico del webhook y utilidad para registrar el webhook con un click.
 */
async function logTelegram(
  updateId: unknown,
  chatId: string | number,
  fromId: string,
  messageText: string,
  replyText: string,
  error?: string | null,
) {
  try {
    await q(
      `insert into telegram_logs (update_id, chat_id, from_user, message_text, reply_text, error) values ($1, $2, $3, $4, $5, $6)`,
      [updateId || null, String(chatId), fromId, messageText.slice(0, 500), replyText.slice(0, 500), error ?? null]
    );
  } catch {}
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const setupWebhook = url.searchParams.get("set_webhook");

  if (setupWebhook && TOKEN) {
    try {
      // Por seguridad estricta: Solo permitir registrar el webhook hacia el mismo dominio de la aplicación
      const webhookTarget = `${url.origin}/api/telegram`;
      const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(webhookTarget)}`);
      const data = await res.json();
      return NextResponse.json({ success: true, webhookTarget, result: data });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
    }
  }

  let tokenValid = false;
  let tokenError: string | null = null;
  let botUsername: string | null = null;
  if (TOKEN) {
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
      const meJson = await meRes.json().catch(() => null);
      if (meRes.ok && meJson?.ok) {
        tokenValid = true;
        botUsername = meJson.result?.username ?? null;
      } else {
        tokenError = `Telegram ${meRes.status}: ${meJson?.description || "Token inválido"}`;
      }
    } catch (e: any) {
      tokenError = e?.message || "Error consultando getMe";
    }
  }

  return NextResponse.json({
    status: "ok",
    botConfigured: Boolean(TOKEN),
    tokenValid,
    botUsername,
    tokenError,
    endpoint: "/api/telegram",
    allowedUsersCount: ALLOWED.length,
    instructions: "Para configurar el webhook de Telegram en Vercel/Producción: GET /api/telegram?set_webhook=https://tu-dominio.vercel.app/api/telegram",
  });
}

/**
 * POST /api/telegram
 * Webhook oficial de Telegram para procesar mensajes, tickets en foto y documentos PDF.
 */
export async function POST(req: Request) {
  if (!TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN no configurado" }, { status: 503 });
  }

  try {
    const update = await req.json();
    const msg = update?.message;
    if (!msg) {
      return NextResponse.json({ ok: true });
    }

    const fromId = String(msg.from?.id ?? "");
    if (ALLOWED.length > 0 && !ALLOWED.includes(fromId)) {
      console.warn(`[api/telegram] Mensaje ignorado de usuario no autorizado: ${fromId}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const chatId = msg.chat?.id;

    // 1. Fotos de Tickets de Compra
    if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
      await tgSendAction(chatId, "typing");
      const bestPhoto = msg.photo[msg.photo.length - 1];
      const fileId = bestPhoto.file_id;

      const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
      if (!fileRes.ok) {
        const errJson = await fileRes.json().catch(() => null);
        const errMsg = `No se pudo obtener la foto de Telegram (HTTP ${fileRes.status}: ${errJson?.description || "error"})`;
        await logTelegram(update?.update_id, chatId, fromId, `[photo] ${msg.caption || ""}`.trim(), "", errMsg);
        throw new Error(errMsg);
      }
      const fileJson = await fileRes.json();
      const filePath = fileJson.result?.file_path;

      if (filePath) {
        let mimeType = "image/jpeg";
        if (filePath.endsWith(".png")) mimeType = "image/png";
        else if (filePath.endsWith(".webp")) mimeType = "image/webp";

        const downloadUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        const imgRes = await fetch(downloadUrl);
        if (!imgRes.ok) {
          const errMsg = `No se pudo descargar la foto de Telegram (HTTP ${imgRes.status})`;
          await logTelegram(update?.update_id, chatId, fromId, `[photo] ${msg.caption || ""}`.trim(), "", errMsg);
          throw new Error(errMsg);
        }
        const buffer = Buffer.from(await imgRes.arrayBuffer());

        const reply = await handleBotPhoto(buffer, mimeType, msg.caption, fromId);
        const sent = await tgSend(chatId, reply);
        await logTelegram(update?.update_id, chatId, fromId, `[photo] ${msg.caption || ""}`.trim(), reply, sent.ok ? null : sent.error);
        try {
          revalidatePath("/");
        } catch {}
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Documentos o Tickets en PDF
    if (msg.document) {
      await tgSendAction(chatId, "typing");
      const fileId = msg.document.file_id;
      const fileName = msg.document.file_name || "ticket.pdf";
      const docMime = msg.document.mime_type || "application/pdf";

      const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
      if (!fileRes.ok) {
        const errJson = await fileRes.json().catch(() => null);
        const errMsg = `No se pudo obtener el documento de Telegram (HTTP ${fileRes.status}: ${errJson?.description || "error"})`;
        await logTelegram(update?.update_id, chatId, fromId, `[doc: ${fileName}] ${msg.caption || ""}`.trim(), "", errMsg);
        throw new Error(errMsg);
      }
      const fileJson = await fileRes.json();
      const filePath = fileJson.result?.file_path;

      if (filePath) {
        const downloadUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        const docRes = await fetch(downloadUrl);
        if (!docRes.ok) {
          const errMsg = `No se pudo descargar el documento de Telegram (HTTP ${docRes.status})`;
          await logTelegram(update?.update_id, chatId, fromId, `[doc: ${fileName}] ${msg.caption || ""}`.trim(), "", errMsg);
          throw new Error(errMsg);
        }
        const buffer = Buffer.from(await docRes.arrayBuffer());

        const reply = await handleBotDocument(buffer, fileName, docMime, msg.caption, fromId);
        const sent = await tgSend(chatId, reply);
        await logTelegram(update?.update_id, chatId, fromId, `[doc: ${fileName}] ${msg.caption || ""}`.trim(), reply, sent.ok ? null : sent.error);
        try {
          revalidatePath("/");
        } catch {}
      }
      return NextResponse.json({ ok: true });
    }

    // 3. Texto o Comandos de JARVIS
    if (msg.text) {
      await tgSendAction(chatId, "typing");
      let reply = "";
      try {
        reply = await handleBotMessage(msg.text, fromId);
      } catch (err: any) {
        reply = `❌ Error procesando mensaje: ${err?.message || "Error desconocido"}`;
      }
      const sent = await tgSend(chatId, reply);
      await logTelegram(update?.update_id, chatId, fromId, msg.text, reply, sent.ok ? null : sent.error);

      try {
        revalidatePath("/");
      } catch {}
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[api/telegram] Error procesando mensaje de webhook:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
