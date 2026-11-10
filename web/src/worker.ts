import fs from "fs";
import path from "path";

// Cargar variables de entorno de .env.local y .env para ejecución standalone
function loadLocalEnv(filename: string) {
  try {
    const filePath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}
loadLocalEnv(".env.local");
loadLocalEnv(".env");

import cron from "node-cron";
import { generateBriefing } from "./lib/briefing";
import { handleBotMessage, handleBotPhoto, handleBotDocument } from "./lib/bot";
import { syncMontessoriMenu } from "./lib/schoolMenu";
import { syncGoogleCalendars } from "./lib/gcal";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ALLOWED = (process.env.TELEGRAM_ALLOWED_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const EVENING_CRON = process.env.BRIEFING_EVENING_CRON || "30 21 * * *";
const MORNING_CRON = process.env.BRIEFING_MORNING_CRON || "0 7 * * *";

async function tgSend(chatId: string | number, text: string) {
  if (!TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("[worker] Error sending telegram message:", err);
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
  } catch (err) {
    // Silently ignore action errors
  }
}

// ── Cron de Briefings ─────────────────────────────────────
function setupCron() {
  console.log(`[worker] Briefing nocturno programado: ${EVENING_CRON}`);
  cron.schedule(
    EVENING_CRON,
    async () => {
      console.log("[worker] Ejecutando briefing nocturno...");
      try {
        const text = await generateBriefing("evening");
        if (CHAT_ID) await tgSend(CHAT_ID, text);
      } catch (err) {
        console.error("[worker] Error en briefing nocturno:", err);
      }
    },
    { timezone: "Europe/Madrid" },
  );

  console.log(`[worker] Briefing matinal programado: ${MORNING_CRON}`);
  cron.schedule(
    MORNING_CRON,
    async () => {
      console.log("[worker] Ejecutando briefing matinal...");
      try {
        const text = await generateBriefing("morning");
        if (CHAT_ID) await tgSend(CHAT_ID, text);
      } catch (err) {
        console.error("[worker] Error en briefing matinal:", err);
      }
    },
    { timezone: "Europe/Madrid" },
  );

  // Sincronización mensual del menú Montessori: primer lunes de cada mes a las 13:00 (Europe/Madrid)
  cron.schedule(
    "0 13 * * 1",
    async () => {
      const today = new Date();
      // El primer lunes de cualquier mes cae siempre entre los días 1 y 7
      if (today.getDate() > 7) {
        return;
      }
      console.log("[worker] Sincronizando menú mensual del colegio Montessori (primer lunes a las 13:00)...");
      try {
        await syncMontessoriMenu();
      } catch (err) {
        console.error("[worker] Error sincronizando menú escolar:", err);
      }
    },
    { timezone: "Europe/Madrid" },
  );

  // Sincronización periódica de Google Calendar cada 30 minutos
  cron.schedule(
    "*/30 * * * *",
    async () => {
      try {
        await syncGoogleCalendars();
      } catch (err) {
        console.error("[worker] Error sincronizando Google Calendar:", err);
      }
    },
    { timezone: "Europe/Madrid" },
  );
}

// ── Telegram Long Polling ──────────────────────────────────
let offset = 0;
async function pollTelegram() {
  if (!TOKEN) {
    console.log("[worker] TELEGRAM_BOT_TOKEN no configurado. Bot en espera.");
    return;
  }
  console.log("[worker] Iniciando long polling de Telegram...");

  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset}&timeout=30`, {
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const u of data.result) {
            offset = u.update_id + 1;
            const msg = u.message;
            if (!msg) continue;

            const fromId = String(msg.from?.id ?? "");
            if (ALLOWED.length > 0 && !ALLOWED.includes(fromId)) {
              console.log(`[worker] Mensaje ignorado de usuario no autorizado: ${fromId}`);
              continue;
            }

            if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
              console.log(`[worker] [Telegram] Foto recibida de ${msg.from?.first_name || fromId} (${fromId})`);
              try {
                await tgSendAction(msg.chat.id, "typing");
                const bestPhoto = msg.photo[msg.photo.length - 1];
                const fileId = bestPhoto.file_id;

                const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
                if (!fileRes.ok) throw new Error(`Telegram getFile falló con status ${fileRes.status}`);
                const fileJson = await fileRes.json();
                const filePath = fileJson.result?.file_path;
                if (!filePath) throw new Error("No se pudo obtener la ruta del archivo (file_path)");

                let mimeType = "image/jpeg";
                if (filePath.endsWith(".png")) mimeType = "image/png";
                else if (filePath.endsWith(".webp")) mimeType = "image/webp";

                const downloadUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
                const imgRes = await fetch(downloadUrl);
                if (!imgRes.ok) throw new Error(`Error descargando la imagen de Telegram (${imgRes.status})`);
                const buffer = Buffer.from(await imgRes.arrayBuffer());

                const reply = await handleBotPhoto(buffer, mimeType, msg.caption, fromId);
                await tgSend(msg.chat.id, reply);
                console.log(`[worker] [Telegram] Foto de ticket procesada y respuesta enviada con éxito.`);
              } catch (err: any) {
                console.error("[worker] [Telegram] Error procesando foto:", err);
                await tgSend(
                  msg.chat.id,
                  `❌ <b>Error al procesar la foto del ticket:</b> ${err?.message || "Error desconocido"}`
                );
              }
            } else if (msg.document) {
              console.log(`[worker] [Telegram] Documento recibido de ${msg.from?.first_name || fromId} (${fromId}): ${msg.document.file_name}`);
              try {
                await tgSendAction(msg.chat.id, "typing");
                const fileId = msg.document.file_id;
                const fileName = msg.document.file_name || "documento.pdf";
                const docMime = msg.document.mime_type || "application/pdf";

                const fileRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
                if (!fileRes.ok) throw new Error(`Telegram getFile falló con status ${fileRes.status}`);
                const fileJson = await fileRes.json();
                const filePath = fileJson.result?.file_path;
                if (!filePath) throw new Error("No se pudo obtener la ruta del documento");

                const downloadUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
                const docRes = await fetch(downloadUrl);
                if (!docRes.ok) throw new Error(`Error descargando el documento (${docRes.status})`);
                const buffer = Buffer.from(await docRes.arrayBuffer());

                const reply = await handleBotDocument(buffer, fileName, docMime, msg.caption, fromId);
                await tgSend(msg.chat.id, reply);
                console.log(`[worker] [Telegram] Documento/Ticket PDF procesado con éxito.`);
              } catch (err: any) {
                console.error("[worker] [Telegram] Error procesando documento:", err);
                await tgSend(
                  msg.chat.id,
                  `❌ <b>Error al procesar el archivo/ticket:</b> ${err?.message || "Error desconocido"}`
                );
              }
            } else if (msg.text) {
              const text = msg.text;
              console.log(`[worker] [Telegram] Mensaje de ${msg.from?.first_name || fromId} (${fromId}): "${text}"`);
              const reply = await handleBotMessage(text, fromId);
              await tgSend(msg.chat.id, reply);
              console.log(`[worker] [Telegram] Respuesta enviada con éxito.`);
            }
          }
        }
      }
    } catch (e) {
      // Breve espera ante errores de red antes de reintentar
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function main() {
  console.log("🚀 Home Dashboard Worker iniciado.");
  setupCron();
  pollTelegram().catch(console.error);
}

main().catch(console.error);
