import { getSetting, upsertExternalEvents } from "./repo";

/**
 * Parsea fechas de iCalendar a ISO string con soporte de UTC y zonas horarias locales (ej. Europe/Madrid).
 */
export function parseIcsDate(dt: string, tzid?: string | null): string {
  if (dt.length === 8) {
    // 20261019 -> 2026-10-19T00:00:00Z
    return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T00:00:00Z`;
  }

  const y = dt.slice(0, 4);
  const m = dt.slice(4, 6);
  const d = dt.slice(6, 8);
  const time = dt.slice(9, 15);
  const hh = time.slice(0, 2) || "00";
  const mm = time.slice(2, 4) || "00";
  const ss = time.slice(4, 6) || "00";

  // UTC (termina en Z)
  if (dt.endsWith("Z")) {
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
  }

  // Fecha local (soporte para TZID=Europe/Madrid por defecto u otra zona horaria)
  const targetTz = tzid || "Europe/Madrid";
  try {
    const fakeUtc = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(fakeUtc);

    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const displayedAsUtc = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour === 24 ? 0 : +p.hour,
      +p.minute,
      +p.second
    );
    const offset = displayedAsUtc - fakeUtc.getTime();
    const realDate = new Date(fakeUtc.getTime() - offset);
    return realDate.toISOString();
  } catch {
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
  }
}

/**
 * Parser ligero de feeds iCalendar (.ics de Google Calendar).
 * Extrae VEVENT: SUMMARY, DTSTART, DTEND, LOCATION, UID.
 */
export function parseIcs(icsText: string, memberId: number, sourceName: string) {
  const events: Array<{
    source: string;
    external_id: string;
    title: string;
    starts_at: string;
    ends_at?: string | null;
    all_day: boolean;
    member_id: number;
    location?: string | null;
  }> = [];

  // Line unfolding del estándar iCalendar (RFC 5545)
  const unfolded = icsText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const rawEvents = unfolded.split(/BEGIN:VEVENT/i);
  for (let i = 1; i < rawEvents.length; i++) {
    const chunk = rawEvents[i].split(/END:VEVENT/i)[0];

    const uidMatch = chunk.match(/UID:(.+)/i);
    const summaryMatch = chunk.match(/SUMMARY:(.+)/i);
    const startMatch = chunk.match(/DTSTART(?:;[^:]+)?:([0-9TZ]+)/i);
    const endMatch = chunk.match(/DTEND(?:;[^:]+)?:([0-9TZ]+)/i);
    const locMatch = chunk.match(/LOCATION:(.+)/i);

    if (!summaryMatch || !startMatch) continue;

    const startTzMatch = chunk.match(/DTSTART[^:\r\n]*TZID=([^:;\r\n]+)/i);
    const endTzMatch = chunk.match(/DTEND[^:\r\n]*TZID=([^:;\r\n]+)/i);
    const startTzid = startTzMatch ? startTzMatch[1].replace(/["']/g, "").trim() : null;
    const endTzid = endTzMatch ? endTzMatch[1].replace(/["']/g, "").trim() : startTzid;

    const uid = uidMatch ? uidMatch[1].trim() : `${sourceName}_${i}_${Date.now()}`;
    const title = summaryMatch[1].trim().replace(/\\,/g, ",").replace(/\\n/g, " ");
    const dtStart = startMatch[1].trim();
    const dtEnd = endMatch ? endMatch[1].trim() : null;
    const location = locMatch ? locMatch[1].trim().replace(/\\,/g, ",") : null;

    const allDay = dtStart.length === 8; // YYYYMMDD
    const startsAt = parseIcsDate(dtStart, startTzid);
    const endsAt = dtEnd ? parseIcsDate(dtEnd, endTzid) : null;

    events.push({
      source: "google",
      external_id: `gcal_${memberId}_${uid}`,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      member_id: memberId,
      location,
    });
  }

  return events;
}

/** Sincroniza los calendarios de Google de Kike y Lara si están configurados en ajustes */
export async function syncGoogleCalendars(): Promise<{ success: boolean; syncedCount: number; message: string }> {
  try {
    const [urlKike, urlLara] = await Promise.all([
      getSetting("gcal_url_kike"),
      getSetting("gcal_url_lara"),
    ]);

    let totalSynced = 0;

    if (urlKike) {
      const res = await fetch(urlKike, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const text = await res.text();
        const events = parseIcs(text, 1, "kike");
        await upsertExternalEvents(events);
        totalSynced += events.length;
      }
    }

    if (urlLara) {
      const res = await fetch(urlLara, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const text = await res.text();
        const events = parseIcs(text, 2, "lara");
        await upsertExternalEvents(events);
        totalSynced += events.length;
      }
    }

    if (!urlKike && !urlLara) {
      return {
        success: true,
        syncedCount: 0,
        message: "No hay URLs de Google Calendar configuradas aún. Configúralas en Ajustes ⚙️.",
      };
    }

    return {
      success: true,
      syncedCount: totalSynced,
      message: `Sincronizados ${totalSynced} eventos de Google Calendar.`,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Error";
    return { success: false, syncedCount: 0, message: `Error al sincronizar Google Calendar: ${errMsg}` };
  }
}
