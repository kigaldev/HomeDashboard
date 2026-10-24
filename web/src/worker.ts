import cron from "node-cron";
import { generateBriefing } from "./lib/briefing";
import { handleBotMessage } from "./lib/bot";
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

            const text = msg.text || "";
            if (text) {
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
