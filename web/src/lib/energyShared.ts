import type { EnergyContract } from "./repo";
import type { DayWeather } from "./weather";

export type PeriodInfo = {
  period: "P1" | "P2";
  name: "Punta" | "Valle";
  isWeekend: boolean;
  hour: number;
  description: string;
};

export type DeviceRecommendation = {
  device: "ev" | "washer" | "dishwasher" | "heating";
  title: string;
  icon: string;
  status: "optimal" | "recommended" | "avoid" | "wait";
  statusLabel: string;
  statusColor: string; // Hex color for Apple badges
  bestHours: string;
  tip: string;
  estimatedCost: string;
};

/**
 * Determina el periodo horario oficial regulado (2.0TD) según la hora local de España peninsular.
 * P2 (Valle): Lunes a Viernes 00:00 a 08:00, y Sábados, Domingos y festivos 24 horas.
 * P1 (Punta): Lunes a Viernes 08:00 a 24:00.
 */
export function getCurrentPeriodInfo(now: Date = new Date()): PeriodInfo {
  // Ajustar a hora española (Madrid)
  const spainTimeStr = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  const d = new Date(spainTimeStr);
  const dayOfWeek = d.getDay(); // 0 domingo, 6 sábado
  const hour = d.getHours();

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return {
      period: "P2",
      name: "Valle",
      isWeekend: true,
      hour,
      description: "Fin de semana (24h Valle): Potencia económica y máxima holgura para electrodomésticos y coche.",
    };
  }

  if (hour >= 0 && hour < 8) {
    return {
      period: "P2",
      name: "Valle",
      isWeekend: false,
      hour,
      description: "Horario nocturno Valle (00:00 a 08:00): Potencia contratada reducida al 50% de coste.",
    };
  }

  return {
    period: "P1",
    name: "Punta",
    isWeekend: false,
    hour,
    description: "Horario diurno Punta (08:00 a 24:00): Precio de energía fijo en Naturgy, pero evita simultaneidad de potencias.",
  };
}

/**
 * Genera las recomendaciones de consumo según las tarifas de Naturgy y la meteorología de hoy.
 */
export function getEnergyRecommendations(
  contracts: EnergyContract[],
  todayWeather: DayWeather | null = null,
  now: Date = new Date(),
): {
  periodInfo: PeriodInfo;
  electricityContract: EnergyContract | null;
  gasContract: EnergyContract | null;
  ev: DeviceRecommendation;
  washer: DeviceRecommendation;
  dishwasher: DeviceRecommendation;
  heating: DeviceRecommendation;
  generalSummary: string;
} {
  const periodInfo = getCurrentPeriodInfo(now);
  const electricity = contracts.find((c) => c.service === "electricity" && c.active) ?? contracts[0] ?? null;
  const gas = contracts.find((c) => c.service === "gas" && c.active) ?? contracts[1] ?? null;

  const elecPrice = electricity?.energy_price_kwh ?? 0.1230;
  const gasPrice = gas?.energy_price_kwh ?? 0.0899;

  // 1. Recomendación Coche Eléctrico (EV)
  const isEvOptimalNow = periodInfo.period === "P2";
  const evCostFull = (50 * elecPrice).toFixed(2);
  const evCostDaily = (20 * elecPrice).toFixed(2);

  const ev: DeviceRecommendation = {
    device: "ev",
    title: "Coche Eléctrico",
    icon: "🚗",
    status: isEvOptimalNow ? "optimal" : "wait",
    statusLabel: isEvOptimalNow ? "Momento Óptimo" : "Esperar a las 00:00",
    statusColor: isEvOptimalNow ? "#34c759" : "#ff9500",
    bestHours: "00:00 – 07:30 (y fines de semana 24h)",
    tip: isEvOptimalNow
      ? "Estás en franja Valle P2. La potencia es un 50% más barata y no interfiere con electrodomésticos de la casa."
      : "Con tu Tarifa Por Uso el kWh es plano las 24h, pero cargar de noche (P2) evita contratar exceso de potencia y disparos de ICP al cocinar.",
    estimatedCost: `~${evCostDaily} € recarga diaria (20 kWh) · ~${evCostFull} € carga completa (50 kWh)`,
  };

  // 2. Recomendación Lavadora / Secadora
  const isMealPrepTime = (periodInfo.hour >= 13 && periodInfo.hour < 15) || (periodInfo.hour >= 20 && periodInfo.hour < 22);
  const washerCost = (1.5 * elecPrice).toFixed(2);

  const washer: DeviceRecommendation = {
    device: "washer",
    title: "Lavadora / Secadora",
    icon: "🧺",
    status: isMealPrepTime ? "avoid" : "optimal",
    statusLabel: isMealPrepTime ? "Evitar por potencia" : "Horario despejado",
    statusColor: isMealPrepTime ? "#ff3b30" : "#34c759",
    bestHours: "10:00–12:30, 15:30–19:30 o noche (00:00–08:00)",
    tip: isMealPrepTime
      ? "Hora de comidas/cenas: Evita poner la lavadora a la vez que el horno o la vitrocerámica para no sobrepasar la potencia."
      : "Al tener precio fijo 24h, cualquier hora fuera de comidas es perfecta. Lava a 30°C o en modo ECO para ahorrar hasta 50% de kWh.",
    estimatedCost: `~${washerCost} € por colada (1,5 kWh)`,
  };

  // 3. Recomendación Lavavajillas
  const dishwasherCost = (1.2 * elecPrice).toFixed(2);
  const dishwasher: DeviceRecommendation = {
    device: "dishwasher",
    title: "Lavavajillas",
    icon: "🍽️",
    status: isEvOptimalNow ? "optimal" : isMealPrepTime ? "avoid" : "recommended",
    statusLabel: isEvOptimalNow ? "Ideal ahora (Valle)" : isMealPrepTime ? "Evitar simultaneidad" : "Aceptable",
    statusColor: isEvOptimalNow ? "#34c759" : isMealPrepTime ? "#ff3b30" : "#0071e3",
    bestHours: "Programar por la noche (00:00–08:00) o mañanas",
    tip: "Programarlo para la madrugada tras la cena es lo más cómodo. Limpia y desinfecta a coste fijo sin ruidos.",
    estimatedCost: `~${dishwasherCost} € por ciclo ECO (1,2 kWh)`,
  };

  // 4. Recomendación Calefacción Gas (adaptada a Salamanca)
  const tMin = todayWeather?.tMin ?? 5;
  const isColdSalamanca = tMin <= 4;
  const boilerCostPerHour = (9 * gasPrice).toFixed(2);

  const heating: DeviceRecommendation = {
    device: "heating",
    title: "Calefacción de Gas",
    icon: "♨️",
    status: "recommended",
    statusLabel: isColdSalamanca ? "Modo Confort Salamanca" : "Modo Eficiente",
    statusColor: "#ff9500",
    bestHours: "Consigna diurna 20°C · Nocturna 17,5°C",
    tip: isColdSalamanca
      ? `Mínima prevista de ${tMin}°C: No apagues del todo los radiadores. Mantener 17,5°C nocturna gasta menos gas que recuperar 4 grados en paredes frías. Ventila de 13:00 a 15:00 con sol.`
      : "El precio de gas de Naturgy es fijo las 24h. Mantén el termostato a 20°C mientras estéis despiertos y abre 10 min a mediodía para renovar el aire.",
    estimatedCost: `~${boilerCostPerHour} €/hora caldera activa (~9 kWh)`,
  };

  const generalSummary = periodInfo.isWeekend
    ? "🎉 Fin de semana: toda la jornada está en franja Valle P2. Coche y electrodomésticos disfrutan de la máxima holgura de potencia."
    : periodInfo.period === "P2"
    ? "🌙 Horario Valle activo: momento perfecto para recargar el coche eléctrico y programar lavados nocturnos."
    : isMealPrepTime
    ? "⚠️ Franja de preparación de comidas: evita encender lavadora, secadora y coche a la vez que vitrocerámica u horno."
    : "☀️ Día laborable: tarifa plana activa. Puedes usar electrodomésticos de forma escalonada con tranquilidad.";

  return {
    periodInfo,
    electricityContract: electricity,
    gasContract: gas,
    ev,
    washer,
    dishwasher,
    heating,
    generalSummary,
  };
}
