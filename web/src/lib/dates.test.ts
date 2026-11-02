import { describe, it, expect } from "vitest";
import { addDays, weekday, parseRelativeDay, isoDate, longDate } from "./dates";

describe("dates", () => {
  it("addDays cruza mes, año y bisiestos", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("addDays no se rompe con el cambio horario", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("weekday: 1 lunes … 7 domingo", () => {
    expect(weekday("2026-11-02")).toBe(1);
    expect(weekday("2026-11-08")).toBe(7);
    expect(weekday("2026-11-07")).toBe(6);
  });

  it("isoDate usa la zona de Madrid", () => {
    expect(isoDate(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
    expect(isoDate(new Date("2026-01-01T12:00:00Z"))).toBe("2026-01-01");
  });

  it("longDate en español", () => {
    expect(longDate("2026-11-02")).toMatch(/lunes/);
  });

  describe("parseRelativeDay (hoy = lunes 2026-11-02)", () => {
    const today = "2026-11-02";
    it("hoy / mañana / pasado mañana", () => {
      expect(parseRelativeDay("hoy", today)).toBe("2026-11-02");
      expect(parseRelativeDay("mañana", today)).toBe("2026-11-03");
      expect(parseRelativeDay("manana a las 5", today)).toBe("2026-11-03");
      expect(parseRelativeDay("pasado mañana", today)).toBe("2026-11-04");
    });
    it("día de la semana: siguiente ocurrencia futura", () => {
      expect(parseRelativeDay("el viernes", today)).toBe("2026-11-06");
      expect(parseRelativeDay("el miércoles", today)).toBe("2026-11-04");
      expect(parseRelativeDay("el sábado", today)).toBe("2026-11-07");
      expect(parseRelativeDay("el lunes", today)).toBe("2026-11-09");
    });
    it("sin referencia devuelve null", () => {
      expect(parseRelativeDay("quiero pan", today)).toBeNull();
    });
  });
});
