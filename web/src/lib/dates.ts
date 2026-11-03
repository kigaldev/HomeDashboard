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

const SPANISH_MONTHS: Record<string, string> = {
  enero: "01",
  ene: "01",
  febrero: "02",
  feb: "02",
  marzo: "03",
  mar: "03",
  abril: "04",
  abr: "04",
  mayo: "05",
  may: "05",
  junio: "06",
  jun: "06",
  julio: "07",
  jul: "07",
  agosto: "08",
  ago: "08",
  septiembre: "09",
  setiembre: "09",
  sep: "09",
  octubre: "10",
  oct: "10",
  noviembre: "11",
  nov: "11",
  diciembre: "12",
  dic: "12",
};

/**
 * Normaliza fechas procedentes de tickets impresos o de análisis OCR/IA al formato YYYY-MM-DD.
 * Soporta ISO (YYYY-MM-DD), formatos españoles habituales (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YY),
 * formatos con marcas horarias adjuntas y fechas en texto ("25 de octubre de 2026").
 * Si la fecha es válida, se preserva íntegramente. Si es inválida o vacía, devuelve la fecha actual.
 */
export function normalizeReceiptDate(raw?: string | null): string {
  if (!raw) return isoDate();
  const trimmed = raw.trim();
  if (!trimmed) return isoDate();

  // 1. ISO o YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD (incluso con hora adjunta ej: "2026-10-25 14:30")
  const isoMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    const yNum = Number(year);
    const mNum = Number(month);
    const dNum = Number(day);
    if (yNum >= 2000 && yNum <= 2099 && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 2. Formato español numérico DD/MM/YYYY, DD-MM-YYYY, DD.MM.YY (incluso con hora adjunta)
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    const yNum = Number(year);
    const mNum = Number(month);
    const dNum = Number(day);
    if (yNum >= 2000 && yNum <= 2099 && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 3. Formato textual español: "25 de octubre de 2026", "25 oct 2026", etc.
  const textMatch = trimmed.match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)(?:\s+de)?\s+(\d{2,4})/i);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const rawMonth = textMatch[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let year = textMatch[3];
    if (year.length === 2) year = `20${year}`;
    const month = SPANISH_MONTHS[rawMonth];
    if (month) {
      const yNum = Number(year);
      const mNum = Number(month);
      const dNum = Number(day);
      if (yNum >= 2000 && yNum <= 2099 && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  // 4. Buscar fecha DD/MM/YYYY o DD-MM-YYYY en cualquier parte del texto
  const embeddedDmy = trimmed.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
  if (embeddedDmy) {
    const day = embeddedDmy[1].padStart(2, "0");
    const month = embeddedDmy[2].padStart(2, "0");
    let year = embeddedDmy[3];
    if (year.length === 2) year = `20${year}`;
    const yNum = Number(year);
    const mNum = Number(month);
    const dNum = Number(day);
    if (yNum >= 2000 && yNum <= 2099 && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  return isoDate();
}
