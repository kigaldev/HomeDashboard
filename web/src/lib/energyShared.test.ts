import { describe, it, expect } from "vitest";
import { getCurrentPeriodInfo, getEnergyRecommendations } from "./energyShared";

describe("getCurrentPeriodInfo (2.0TD, hora Madrid)", () => {
  it("laborable de día = Punta P1", () => {
    // lunes 2026-11-02 11:00 Madrid (CET = UTC+1)
    const p = getCurrentPeriodInfo(new Date("2026-11-02T10:00:00Z"));
    expect(p.period).toBe("P1");
    expect(p.isWeekend).toBe(false);
    expect(p.hour).toBe(11);
  });
  it("laborable de madrugada = Valle P2", () => {
    const p = getCurrentPeriodInfo(new Date("2026-11-02T03:00:00Z"));
    expect(p.period).toBe("P2");
    expect(p.isWeekend).toBe(false);
  });
  it("límite 08:00 ya es Punta, 07:59 Valle", () => {
    expect(getCurrentPeriodInfo(new Date("2026-11-02T07:00:00Z")).period).toBe("P1");
    expect(getCurrentPeriodInfo(new Date("2026-11-02T06:59:00Z")).period).toBe("P2");
  });
  it("fin de semana = Valle 24h", () => {
    const p = getCurrentPeriodInfo(new Date("2026-11-07T12:00:00Z"));
    expect(p.period).toBe("P2");
    expect(p.isWeekend).toBe(true);
  });
  it("usa hora de Madrid, no UTC (sábado 00:30 Madrid = viernes 23:30 UTC)", () => {
    expect(getCurrentPeriodInfo(new Date("2026-11-06T23:30:00Z")).isWeekend).toBe(true);
  });
});

describe("getEnergyRecommendations", () => {
  it("funciona sin contratos y con precios por defecto", () => {
    const r = getEnergyRecommendations([], null, new Date("2026-11-07T12:00:00Z"));
    expect(r.electricityContract).toBeNull();
    expect(r.ev.status).toBe("optimal");
    expect(typeof r.generalSummary).toBe("string");
  });
  it("EV en espera en horario punta", () => {
    const r = getEnergyRecommendations([], null, new Date("2026-11-02T10:00:00Z"));
    expect(r.ev.status).toBe("wait");
  });
});
