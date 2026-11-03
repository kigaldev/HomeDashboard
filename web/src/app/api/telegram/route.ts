import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { handleBotMessage, handleBotPhoto, handleBotDocument } from "@/lib/bot";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED = (process.env.TELEGRAM_ALLOWED_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function tgSend(chatId: string | number, text: string) {
  if (!TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[api/telegram] Error enviando mensaje a Telegram:", err);
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
export async function GET(req: Request) {
  const url = new URL(req.url);
  const setupUrl = url.searchParams.get("set_webhook");

  if (setupUrl && TOKEN) {
    try {
      const webhookTarget = setupUrl.startsWith("http") ? setupUrl : `${url.origin}/api/telegram`;
      const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(webhookTarget)}`);
      const data = await res.json();
      return NextResponse.json({ success: true, webhookTarget, result: data });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: "ok",
    botConfigured: Boolean(TOKEN),
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

      const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
      if (!fileRes.ok) throw new Error("No se pudo obtener el archivo de Telegram");
      const fileJson = await fileRes.json();
      const filePath = fileJson.result?.file_path;

      if (filePath) {
        let mimeType = "image/jpeg";
        if (filePath.endsWith(".png")) mimeType = "image/png";
        else if (filePath.endsWith(".webp")) mimeType = "image/webp";

        const downloadUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        const imgRes = await fetch(downloadUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());

        const reply = await handleBotPhoto(buffer, mimeType, msg.caption, fromId);
        await tgSend(chatId, reply);
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

      const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
      if (!fileRes.ok) throw new Error("No se pudo obtener el documento de Telegram");
      const fileJson = await fileRes.json();
      const filePath = fileJson.result?.file_path;

      if (filePath) {
        const downloadUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        const docRes = await fetch(downloadUrl);
        const buffer = Buffer.from(await docRes.arrayBuffer());

        const reply = await handleBotDocument(buffer, fileName, docMime, msg.caption, fromId);
        await tgSend(chatId, reply);
        try {
          revalidatePath("/");
        } catch {}
      }
      return NextResponse.json({ ok: true });
    }

    // 3. Texto o Comandos de JARVIS
    if (msg.text) {
      await tgSendAction(chatId, "typing");
      const reply = await handleBotMessage(msg.text, fromId);
      await tgSend(chatId, reply);
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
