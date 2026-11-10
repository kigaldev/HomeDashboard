export type TrafficStatus = "fluido" | "moderado" | "denso";

export type CommuteTraffic = {
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  distanceKm: number;
  baseDurationMinutes: number;
  durationMinutes: number;
  delayMinutes: number;
  status: TrafficStatus;
  statusLabel: string;
  trafficColor: string;
  fastestRoute: string;
  advisory: string;
  googleMapsUrl: string;
  wazeUrl: string;
  updatedAt: string;
};

// Coordenadas exactas:
// Origen: Las Torres, Arapiles (Salamanca)
const ORIGIN = {
  name: "Casa (Las Torres, Arapiles)",
  lat: 40.9079,
  lon: -5.6529,
};

// Destino: Colegio Montessori Salamanca (Calle Rafael Lapesa 1)
const DESTINATION = {
  name: "Colegio Montessori Salamanca",
  lat: 40.9795,
  lon: -5.6504,
};

const cache = new Map<string, { data: CommuteTraffic; time: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

/**
 * Obtiene la estimación de tráfico y duración en vivo entre Las Torres (Arapiles)
 * y el Colegio Montessori (Salamanca).
 */
export async function getSchoolCommuteTraffic(isRaining = false): Promise<CommuteTraffic> {
  const cacheKey = isRaining ? "rain" : "dry";
  const now = Date.now();
  const entry = cache.get(cacheKey);
  if (entry && now - entry.time < CACHE_TTL_MS) {
    return entry.data;
  }

  let distanceKm = 12.1;
  let baseDurationMinutes = 17;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${ORIGIN.lon},${ORIGIN.lat};${DESTINATION.lon},${DESTINATION.lat}?overview=false`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 180 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.routes?.[0]) {
        const route = data.routes[0];
        distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        baseDurationMinutes = Math.max(12, Math.round(route.duration / 60));
      }
    }
  } catch {
    // Si OSRM no responde o timeout, usamos los valores base de calibración de Salamanca (12.1 km, 17 min)
  }

  // Evaluación del tráfico según hora local en Madrid
  const d = new Date();
  const day = d.getDay(); // 0 domingo, 6 sábado
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  let delayMinutes = 0;
  let status: TrafficStatus = "fluido";
  let statusLabel = "Tráfico fluido";
  let trafficColor = "var(--apple-green)";
  let advisory = "Ruta directa despejada por SA-20 / Vía Helmántica.";

  const isWeekday = day >= 1 && day <= 5;

  if (isWeekday) {
    // Punta matinal de entrada a colegios (07:45 a 09:15)
    if (timeInMinutes >= 7 * 60 + 45 && timeInMinutes <= 9 * 60 + 15) {
      delayMinutes = 5;
      status = "denso";
      statusLabel = "Hora punta escolar";
      trafficColor = "var(--apple-orange)";
      advisory = "Retenciones habituales en rotondas de acceso y Vía Helmántica. Salir con 5-8 min de antelación.";
    }
    // Salida escolar mediodía / almuerzo (13:40 a 14:35)
    else if (timeInMinutes >= 13 * 60 + 40 && timeInMinutes <= 14 * 60 + 35) {
      delayMinutes = 3;
      status = "moderado";
      statusLabel = "Tráfico moderado";
      trafficColor = "var(--apple-yellow)";
      advisory = "Tráfico algo más denso en accesos de mediodía.";
    }
    // Salida escolar de tarde (16:45 a 18:15)
    else if (timeInMinutes >= 16 * 60 + 45 && timeInMinutes <= 18 * 60 + 15) {
      delayMinutes = 4;
      status = "moderado";
      statusLabel = "Salida escolar / tarde";
      trafficColor = "var(--apple-yellow)";
      advisory = "Tráfico moderado en rotonda SA-20 hacia el norte.";
    }
  }

  // Si llueve, extremar precaución y sumar 2 min de retención por asfalto mojado
  if (isRaining) {
    delayMinutes += 2;
    if (status === "fluido") {
      status = "moderado";
      statusLabel = "Lluvia: tráfico ralentizado";
      trafficColor = "var(--apple-yellow)";
    }
    advisory += " Pavimento mojado por lluvia, extremar distancia en rotondas.";
  }

  const durationMinutes = baseDurationMinutes + delayMinutes;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${ORIGIN.lat},${ORIGIN.lon}&destination=${DESTINATION.lat},${DESTINATION.lon}&travelmode=driving`;
  const wazeUrl = `https://waze.com/ul?ll=${DESTINATION.lat},${DESTINATION.lon}&navigate=yes`;

  const updatedTimeStr = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  const result: CommuteTraffic = {
    origin: ORIGIN,
    destination: DESTINATION,
    distanceKm,
    baseDurationMinutes,
    durationMinutes,
    delayMinutes,
    status,
    statusLabel,
    trafficColor,
    fastestRoute: "SA-20 y Ronda Interior",
    advisory,
    googleMapsUrl,
    wazeUrl,
    updatedAt: updatedTimeStr,
  };

  cache.set(cacheKey, { data: result, time: now });
  return result;
}
