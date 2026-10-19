import { getSetting, upsertExternalEvents } from "./repo";

/**
 * Parser ligero de feeds iCalendar (.ics de Google Calendar).
 * Extrae VEVENT: SUMMARY, DTSTART, DTEND, LOCATION, UID.
 */
function parseIcs(icsText: string, memberId: number, sourceName: string) {
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

  const rawEvents = icsText.split(/BEGIN:VEVENT/i);
  for (let i = 1; i < rawEvents.length; i++) {
    const chunk = rawEvents[i].split(/END:VEVENT/i)[0];

    const uidMatch = chunk.match(/UID:(.+)/i);
    const summaryMatch = chunk.match(/SUMMARY:(.+)/i);
    const startMatch = chunk.match(/DTSTART(?:;[^:]+)?:([0-9TZ]+)/i);
    const endMatch = chunk.match(/DTEND(?:;[^:]+)?:([0-9TZ]+)/i);
    const locMatch = chunk.match(/LOCATION:(.+)/i);

    if (!summaryMatch || !startMatch) continue;

    const uid = uidMatch ? uidMatch[1].trim() : `${sourceName}_${i}_${Date.now()}`;
    const title = summaryMatch[1].trim().replace(/\\,/g, ",").replace(/\\n/g, " ");
    const dtStart = startMatch[1].trim();
    const dtEnd = endMatch ? endMatch[1].trim() : null;
    const location = locMatch ? locMatch[1].trim().replace(/\\,/g, ",") : null;

    const allDay = dtStart.length === 8; // YYYYMMDD
    let startsAt: string;

    if (allDay) {
      // 20261019 -> 2026-10-19T00:00:00Z
      startsAt = `${dtStart.slice(0, 4)}-${dtStart.slice(4, 6)}-${dtStart.slice(6, 8)}T00:00:00Z`;
    } else {
      // 20261019T093000Z
      const y = dtStart.slice(0, 4);
      const m = dtStart.slice(4, 6);
      const d = dtStart.slice(6, 8);
      const time = dtStart.slice(9, 15);
      startsAt = `${y}-${m}-${d}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`;
    }

    events.push({
      source: "google",
      external_id: `gcal_${memberId}_${uid}`,
      title,
      starts_at: startsAt,
      ends_at: dtEnd ? startsAt : null,
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
