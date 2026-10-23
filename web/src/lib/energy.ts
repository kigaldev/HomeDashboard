import "server-only";
import { llm, geminiVision, parseJson } from "./llm";
import {
  upsertEnergyContract,
  type EnergyContract,
} from "./repo";

export * from "./energyShared";

/**
 * Agente de Ingesta y Memoria: Procesa texto OCR de una factura o contrato de energía con Gemini
 * y actualiza automáticamente los datos de la tarifa en Supabase.
 */
export async function parseEnergyBillText(billText: string): Promise<{
  success: boolean;
  contract?: Partial<EnergyContract>;
  summary: string;
}> {
  const prompt = `Actúas como un Analista Experto en Facturas y Tarifas de Luz y Gas en España (Mercado Libre y Regulado).
Analiza el siguiente texto extraído de una factura o contrato de suministros (Naturgy, Iberdrola, Endesa, TotalEnergies, etc.) y extrae sus parámetros esenciales.

Texto de la factura/documento:
"""
${billText}
"""

Responde EXCLUSIVAMENTE con un JSON válido con este esquema:
{
  "service": "electricity" | "gas",
  "provider": "Naturgy" | string,
  "tariff_name": "Tarifa Por Uso Luz" | string,
  "access_toll": "2.0TD" | "RL.1" | "RL.2" | "RL.3" | null,
  "energy_price_kwh": number (ej. 0.1230),
  "power_p1_kw": number o null (precio término potencia punta en €/kW día o €/kW año normalizado a día),
  "power_p2_kw": number o null (precio término potencia valle en €/kW día),
  "fixed_monthly_price": number o null (término fijo mensual en gas ej. 9.55),
  "billing_period": string o null (ej. "01/09/2026 - 30/09/2026"),
  "total_amount": number o null (importe total de la factura con impuestos),
  "summary": string (resumen explicativo de 2 frases con los puntos clave encontrados y cómo afecta a las recomendaciones de la casa)
}`;

  const res = await llm(
    [
      { role: "system", content: "Eres un extractor de datos de tarifas energéticas de alta precisión. Devuelve solo JSON." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.1, json: true },
  );

  if (!res) {
    return { success: false, summary: "No se pudo comunicar con el modelo de IA para analizar el documento." };
  }

  const parsed = parseJson<any>(res);
  if (!parsed || !parsed.service || typeof parsed.energy_price_kwh !== "number") {
    return { success: false, summary: "No se pudieron identificar las tarifas ni el precio por kWh en el documento proporcionado." };
  }

  // Guardar en la base de datos
  await upsertEnergyContract({
    service: parsed.service,
    provider: parsed.provider || "Naturgy",
    tariff_name: parsed.tariff_name || (parsed.service === "electricity" ? "Tarifa Por Uso Luz" : "Tarifa Por Uso Gas"),
    access_toll: parsed.access_toll,
    energy_price_kwh: parsed.energy_price_kwh,
    power_p1_kw: parsed.power_p1_kw,
    power_p2_kw: parsed.power_p2_kw,
    fixed_monthly_price: parsed.fixed_monthly_price,
    notes: `Actualizado automáticamente por el Agente de Memoria el ${new Date().toLocaleDateString("es-ES")}. Periodo: ${parsed.billing_period || "Actual"}. ${parsed.summary || ""}`,
    metadata: {
      billing_period: parsed.billing_period,
      total_amount: parsed.total_amount,
    },
  });

  return {
    success: true,
    contract: parsed,
    summary: parsed.summary || `Tarifa de ${parsed.service === "electricity" ? "electricidad" : "gas"} actualizada con éxito a ${parsed.energy_price_kwh} €/kWh.`,
  };
}

/**
 * Agente de Ingesta y Memoria: Procesa una foto o captura de factura con Gemini Vision.
 */
export async function parseEnergyBillImage(
  base64Image: string,
  mimeType: string = "image/jpeg",
): Promise<{
  success: boolean;
  contract?: Partial<EnergyContract>;
  summary: string;
}> {
  const prompt = `Analiza esta imagen de una factura o documento de contrato de luz o gas en España (como Naturgy Tarifa Por Uso).
Identifica el tipo de servicio (luz/gas), comercializadora, nombre de la tarifa, peaje de acceso, precio del kWh de energía (€/kWh), precios de potencia P1 y P2 (€/kW día), término fijo de gas (€/mes) y el importe total.

Devuelve EXCLUSIVAMENTE este JSON:
{
  "service": "electricity" | "gas",
  "provider": "Naturgy" | string,
  "tariff_name": string,
  "access_toll": "2.0TD" | "RL.1" | "RL.2" | null,
  "energy_price_kwh": number,
  "power_p1_kw": number o null,
  "power_p2_kw": number o null,
  "fixed_monthly_price": number o null,
  "billing_period": string o null,
  "total_amount": number o null,
  "summary": string
}`;

  const res = await geminiVision(prompt, base64Image, mimeType, { json: true });
  if (!res) {
    return { success: false, summary: "No se pudo procesar la imagen con Gemini Vision." };
  }

  const parsed = parseJson<any>(res);
  if (!parsed || !parsed.service || typeof parsed.energy_price_kwh !== "number") {
    return { success: false, summary: "No se pudieron extraer datos claros de la imagen de la factura." };
  }

  await upsertEnergyContract({
    service: parsed.service,
    provider: parsed.provider || "Naturgy",
    tariff_name: parsed.tariff_name || (parsed.service === "electricity" ? "Tarifa Por Uso Luz" : "Tarifa Por Uso Gas"),
    access_toll: parsed.access_toll,
    energy_price_kwh: parsed.energy_price_kwh,
    power_p1_kw: parsed.power_p1_kw,
    power_p2_kw: parsed.power_p2_kw,
    fixed_monthly_price: parsed.fixed_monthly_price,
    notes: `Actualizado por foto/escaneo de factura el ${new Date().toLocaleDateString("es-ES")}. ${parsed.summary || ""}`,
    metadata: {
      billing_period: parsed.billing_period,
      total_amount: parsed.total_amount,
    },
  });

  return {
    success: true,
    contract: parsed,
    summary: parsed.summary || `Factura procesada y guardada: ${parsed.provider} ${parsed.tariff_name} (${parsed.energy_price_kwh} €/kWh).`,
  };
}
