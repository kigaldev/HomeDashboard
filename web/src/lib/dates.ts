export const TZ = process.env.TZ_HOME || "Europe/Madrid";

/** Fecha local (Europe/Madrid) en formato YYYY-MM-DD. */
export function isoDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n, 12));
  return dt.toISOString().slice(0, 10);
}

/** 1 = lunes … 7 = domingo */
export function weekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

export function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

export function timeOf(ts: string | Date): string {
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ts));
}

export function hourNow(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(new Date()));
}

export function greeting(): string {
  const h = hourNow();
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function ageLabel(birth: string | null): string {
  if (!birth) return "";
  const [y, m, d] = birth.split("-").map(Number);
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months--;
  if (months < 24) return `${months} meses`;
  return `${Math.floor(months / 12)} años`;
}

/** Interpreta "hoy", "mañana", "pasado mañana", "el viernes"… */
export function parseRelativeDay(text: string, today = isoDate()): string | null {
  const t = text.toLowerCase();
  if (/\bpasado ma[ñn]ana\b/.test(t)) return addDays(today, 2);
  if (/\bma[ñn]ana\b/.test(t)) return addDays(today, 1);
  if (/\bhoy\b/.test(t)) return today;
  const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const norm = t.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${days[i]}\\b`).test(norm)) {
      const cur = weekday(today);
      let diff = i + 1 - cur;
      if (diff <= 0) diff += 7;
      return addDays(today, diff);
    }
  }
  return null;
}
