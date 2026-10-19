export type DayWeather = {
  date: string;
  code: number;
  tMin: number;
  tMax: number;
  rainProb: number;
  rainMm: number;
  windMax: number;
  uvMax: number;
  morningTemp: number | null;
};
export type Weather = { place: string; current: { temp: number; code: number } | null; days: DayWeather[] };

const LAT = process.env.WEATHER_LAT || "40.9701";
const LON = process.env.WEATHER_LON || "-5.6635";
export const PLACE = process.env.WEATHER_PLACE || "Salamanca";

/** Open-Meteo: gratuito y sin API key. Cache 30 min. */
export async function getWeather(): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max` +
    `&hourly=temperature_2m&timezone=Europe%2FMadrid&forecast_days=3`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const j = await res.json();
    const days: DayWeather[] = j.daily.time.map((date: string, i: number) => {
      const idx = (j.hourly.time as string[]).indexOf(`${date}T08:00`);
      return {
        date,
        code: j.daily.weather_code[i],
        tMin: Math.round(j.daily.temperature_2m_min[i]),
        tMax: Math.round(j.daily.temperature_2m_max[i]),
        rainProb: j.daily.precipitation_probability_max[i] ?? 0,
        rainMm: j.daily.precipitation_sum[i] ?? 0,
        windMax: Math.round(j.daily.wind_speed_10m_max[i]),
        uvMax: Math.round(j.daily.uv_index_max[i] ?? 0),
        morningTemp: idx >= 0 ? Math.round(j.hourly.temperature_2m[idx]) : null,
      };
    });
    return {
      place: PLACE,
      current: j.current ? { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code } : null,
      days,
    };
  } catch {
    return null;
  }
}

export function weatherLabel(code: number): { icon: string; text: string } {
  if (code === 0) return { icon: "☀️", text: "Despejado" };
  if (code <= 2) return { icon: "🌤️", text: "Poco nuboso" };
  if (code === 3) return { icon: "☁️", text: "Nublado" };
  if (code <= 48) return { icon: "🌫️", text: "Niebla" };
  if (code <= 57) return { icon: "🌦️", text: "Llovizna" };
  if (code <= 67) return { icon: "🌧️", text: "Lluvia" };
  if (code <= 77) return { icon: "🌨️", text: "Nieve" };
  if (code <= 82) return { icon: "🌧️", text: "Chubascos" };
  return { icon: "⛈️", text: "Tormenta" };
}

/** Consejo de ropa para peques de 0-5 años (van a la guarde/cole por la mañana). */
export function kidsOutfit(d: DayWeather): string[] {
  const t = d.morningTemp ?? d.tMin;
  const out: string[] = [];
  if (t <= 5) out.push("Abrigo gordo, gorro, guantes y bufanda");
  else if (t <= 10) out.push("Abrigo y gorro");
  else if (t <= 15) out.push("Chaqueta o plumífero fino");
  else if (t <= 20) out.push("Sudadera o rebeca");
  else out.push("Manga corta");
  if (d.tMax - t >= 8) out.push("Por capas: a mediodía sube a " + d.tMax + "°");
  if (d.rainProb >= 50 || d.rainMm >= 1) out.push("Chubasquero y botas de agua");
  else if (d.rainProb >= 30) out.push("Chubasquero en la mochila por si acaso");
  if (d.uvMax >= 6) out.push("Gorra y crema solar");
  if (d.windMax >= 40) out.push("Viento fuerte: cortavientos");
  return out;
}
