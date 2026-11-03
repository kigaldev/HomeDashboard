import { describe, it, expect } from "vitest";
import { parseIcs, parseIcsDate } from "./gcal";

describe("gcal parseIcs", () => {
  it("despliega líneas largas mediante line unfolding (RFC 5545)", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:unfold-test-1",
      "SUMMARY:Reunión muy importante sobre el pro",
      " yecto de innovación familiar",
      "DTSTART;VALUE=DATE:20261103",
      "DTEND;VALUE=DATE:20261104",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseIcs(ics, 1, "kike");
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Reunión muy importante sobre el proyecto de innovación familiar");
  });

  it("calcula ends_at correctamente a partir de dtEnd en lugar de duplicar startsAt", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:end-time-test",
      "SUMMARY:Consulta Médica",
      "DTSTART:20261103T100000Z",
      "DTEND:20261103T113000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseIcs(ics, 2, "lara");
    expect(events).toHaveLength(1);
    expect(events[0].starts_at).toBe("2026-11-03T10:00:00Z");
    expect(events[0].ends_at).toBe("2026-11-03T11:30:00Z");
    expect(events[0].ends_at).not.toBe(events[0].starts_at);
  });

  it("asigna ends_at a null si el evento no tiene DTEND", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:no-end-test",
      "SUMMARY:Recordatorio rápido",
      "DTSTART:20261103T170000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const events = parseIcs(ics, 1, "kike");
    expect(events).toHaveLength(1);
    expect(events[0].starts_at).toBe("2026-11-03T17:00:00Z");
    expect(events[0].ends_at).toBeNull();
  });

  it("soporta fechas UTC ('Z') y fechas locales con TZID=Europe/Madrid", () => {
    const icsUtc = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:utc-event",
      "SUMMARY:Evento UTC",
      "DTSTART:20261019T093000Z",
      "DTEND:20261019T103000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const eventsUtc = parseIcs(icsUtc, 1, "kike");
    expect(eventsUtc[0].starts_at).toBe("2026-10-19T09:30:00Z");
    expect(eventsUtc[0].ends_at).toBe("2026-10-19T10:30:00Z");

    // Fecha con TZID=Europe/Madrid (en octubre CEST = UTC+2, por lo que 09:30 local -> 07:30 UTC)
    const icsMadrid = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:madrid-event",
      "SUMMARY:Evento Madrid",
      "DTSTART;TZID=Europe/Madrid:20261019T093000",
      "DTEND;TZID=Europe/Madrid:20261019T103000",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const eventsMadrid = parseIcs(icsMadrid, 1, "kike");
    expect(eventsMadrid[0].starts_at).toBe("2026-10-19T07:30:00.000Z");
    expect(eventsMadrid[0].ends_at).toBe("2026-10-19T08:30:00.000Z");
  });

  it("parseIcsDate convierte correctamente fechas all-day, UTC y locales", () => {
    // All-day YYYYMMDD
    expect(parseIcsDate("20261103")).toBe("2026-11-03T00:00:00Z");

    // UTC
    expect(parseIcsDate("20261103T150000Z")).toBe("2026-11-03T15:00:00Z");

    // Local invierno Madrid (CET = UTC+1: 15:00 local -> 14:00 UTC)
    expect(parseIcsDate("20260115T150000", "Europe/Madrid")).toBe("2026-01-15T14:00:00.000Z");
  });
});
