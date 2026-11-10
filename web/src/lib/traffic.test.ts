import { describe, it, expect, vi } from "vitest";
import { getSchoolCommuteTraffic } from "./traffic";

describe("traffic", () => {
  it("obtiene la estimación de ruta entre Las Torres (Arapiles) y Col. Montessori", async () => {
    const traffic = await getSchoolCommuteTraffic(false);
    expect(traffic).toBeDefined();
    expect(traffic.origin.name).toContain("Las Torres, Arapiles");
    expect(traffic.destination.name).toContain("Montessori");
    expect(traffic.distanceKm).toBeGreaterThan(5);
    expect(traffic.durationMinutes).toBeGreaterThan(10);
    expect(traffic.googleMapsUrl).toContain("40.9079,-5.6529");
    expect(traffic.googleMapsUrl).toContain("40.9795,-5.6504");
  });

  it("aplica penalización por lluvia y emite advertencia de pavimento", async () => {
    const traffic = await getSchoolCommuteTraffic(true);
    expect(traffic.advisory).toMatch(/mojado|lluvia/i);
    expect(traffic.delayMinutes).toBeGreaterThanOrEqual(2);
  });
});
