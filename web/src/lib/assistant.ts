import "server-only";
import { daySnapshot, snapshotText } from "./context";
import { addDays, isoDate, parseRelativeDay, timeOf } from "./dates";
import { llm, parseJson, type ChatMsg } from "./llm";
import {
  getSchoolMenuRange,
  getEventsBetween,
  getMembers,
  addShopping,
  setPantry,
  addTask,
  getStores,
  setSchoolRunOverride,
  chooseDinner,
  getOpenTasks,
  getEnergyContracts,
  upsertEnergyContract,
} from "./repo";
import { getEnergyRecommendations, parseEnergyBillText } from "./energy";

export type AgentActionResult = {
  message: string;
  actionExecuted?: {
    type: "shopping" | "pantry" | "task" | "school_run" | "dinner" | "energy" | "info";
    description: string;
  };
};

/**
 * Agente Inteligente de Acción del Dashboard.
 * Es capaz de responder preguntas y REALIZAR CAMBIOS en tiempo real:
 * - Añadir productos a la lista de la compra (Mercadona, Carrefour, Lidl, Farmacia)
 * - Actualizar estado de la despensa ("se ha terminado la leche" -> status out)
 * - Crear tareas asignadas a Kike o Lara con fecha
 * - Modificar turnos del cole Montessori (quién lleva/recoge a Fabio)
 * - Seleccionar o cambiar cenas
 */
export async function runAgentInstruction(
  instruction: string,
  history: ChatMsg[] = [],
): Promise<AgentActionResult> {
  const clean = instruction.trim();
  const lower = clean.toLowerCase();
  const today = isoDate();
  const members = await getMembers();
  const stores = await getStores();

  const kikeId = members.find((m) => m.name.toLowerCase() === "kike")?.id ?? 1;
  const laraId = members.find((m) => m.name.toLowerCase() === "lara")?.id ?? 2;

  // ── Heurística Rápida 1: Compra (ej. "añade leche a mercadona", "comprar pañales") ──
  const shoppingMatch = lower.match(/(?:añade|agrega|mete|apunta|comprar|compra)\s+(?:a la compra\s+)?(.+)/i);
  if (shoppingMatch && !lower.includes("tarea") && !lower.includes("cena")) {
    let rawItem = shoppingMatch[1].trim();

    // Detectar tienda destino
    let storeId: number | null = null;
    let storeName = "";
    if (rawItem.toLowerCase().includes("mercadona")) {
      storeId = stores.find((s) => s.name === "Mercadona")?.id ?? null;
      storeName = "Mercadona";
      rawItem = rawItem.replace(/en mercadona|a mercadona|de mercadona/gi, "").trim();
    } else if (rawItem.toLowerCase().includes("carrefour")) {
      storeId = stores.find((s) => s.name === "Carrefour")?.id ?? null;
      storeName = "Carrefour";
      rawItem = rawItem.replace(/en carrefour|a carrefour|de carrefour/gi, "").trim();
    } else if (rawItem.toLowerCase().includes("lidl")) {
      storeId = stores.find((s) => s.name === "Lidl")?.id ?? null;
      storeName = "Lidl";
      rawItem = rawItem.replace(/en lidl|a lidl|de lidl/gi, "").trim();
    } else if (rawItem.toLowerCase().includes("farmacia")) {
      storeId = stores.find((s) => s.name === "Farmacia")?.id ?? null;
      storeName = "Farmacia";
      rawItem = rawItem.replace(/en farmacia|a farmacia|de la farmacia/gi, "").trim();
    }

    // Puede ser una lista separada por 'y' o comas
    const items = rawItem
      .split(/,|\by\b/i)
      .map((s) => s.replace(/^a\s+la\s+compra/i, "").trim())
      .filter((s) => s.length > 1);

    if (items.length > 0) {
      for (const item of items) {
        await addShopping(item, { storeId });
      }
      const destText = storeName ? ` en **${storeName}**` : "";
      return {
        message: `🛒 ¡Hecho! He añadido a la lista de la compra${destText}: **${items.join(", ")}**.`,
        actionExecuted: {
          type: "shopping",
          description: `Añadido(s) a la compra: ${items.join(", ")}${storeName ? ` (${storeName})` : ""}`,
        },
      };
    }
  }

  // ── Heurística Rápida 2: Despensa / Se ha terminado (ej. "se ha acabado la leche") ──
  const pantryOutMatch = lower.match(/(?:se ha(?:n)? (?:acabado|terminado|gastado)|no queda(?:n)?|queda poco de|falta)\s+(.+)/i);
  if (pantryOutMatch && !lower.includes("tiempo") && !lower.includes("tarea")) {
    const itemName = pantryOutMatch[1].trim();
    const isLow = lower.includes("poco");
    const status = isLow ? "low" : "out";
    await setPantry(itemName, status);
    return {
      message: `📦 Entendido. He actualizado **${itemName}** en la despensa como *${isLow ? "quedando poco" : "agotado"}* y lo he puesto en la lista de la compra para reponerlo.`,
      actionExecuted: {
        type: "pantry",
        description: `Despensa: ${itemName} marcado como ${status}`,
      },
    };
  }

  // ── Heurística Rápida 3: Turnos del Cole (ej. "mañana Kike lleva a Fabio y Lara lo recoge") ──
  if (lower.includes("cole") || lower.includes("lleva") || lower.includes("recoge")) {
    const targetDate = parseRelativeDay(lower, today) ?? (lower.includes("mañana") ? addDays(today, 1) : today);
    let dropoffId: number | null = null;
    let pickupId: number | null = null;

    if (lower.includes("kike lleva") || lower.includes("lleva kike")) dropoffId = kikeId;
    else if (lower.includes("lara lleva") || lower.includes("lleva lara")) dropoffId = laraId;

    if (lower.includes("kike recoge") || lower.includes("recoge kike")) pickupId = kikeId;
    else if (lower.includes("lara recoge") || lower.includes("recoge lara")) pickupId = laraId;

    if (dropoffId !== null || pickupId !== null) {
      await setSchoolRunOverride(targetDate, dropoffId, pickupId, `Cambio solicitado por el agente (${clean})`);
      const dropName = dropoffId === kikeId ? "Kike" : dropoffId === laraId ? "Lara" : "Sin asignar";
      const pickName = pickupId === kikeId ? "Kike" : pickupId === laraId ? "Lara" : "Sin asignar";
      return {
        message: `🏫 ¡Actualizado el turno del cole para el ${targetDate}!\n- **Lleva a Fabio:** ${dropName}\n- **Lo recoge:** ${pickName}`,
        actionExecuted: {
          type: "school_run",
          description: `Cole ${targetDate}: lleva ${dropName}, recoge ${pickName}`,
        },
      };
    }
  }

  // ── Heurística Rápida 4: Crear Tarea (ej. "tarea para Kike: llamar al pediatra") ──
  const taskMatch = lower.match(/(?:añade|crea|nueva)?\s*tarea(?:\s+para\s+(\w+))?[:\s]+(.+)/i);
  if (taskMatch) {
    const person = (taskMatch[1] || "").toLowerCase();
    const taskTitle = taskMatch[2].trim();
    let assigneeId: number | null = null;
    if (person.includes("kike")) assigneeId = kikeId;
    else if (person.includes("lara")) assigneeId = laraId;

    const due = parseRelativeDay(taskTitle, today);
    await addTask(taskTitle, assigneeId, due);
    const assignName = assigneeId === kikeId ? "Kike" : assigneeId === laraId ? "Lara" : "Cualquiera";
    return {
      message: `✅ Tarea creada: **"${taskTitle}"** asignada a **${assignName}**${due ? ` para el ${due}` : ""}.`,
      actionExecuted: {
        type: "task",
        description: `Tarea creada: ${taskTitle} (${assignName})`,
      },
    };
  }

  // ── Heurística Rápida 5: Elegir Cena (ej. "elijo la cena mambo", "cenamos tortilla") ──
  if (lower.includes("cena") && (lower.includes("mambo") || lower.includes("estándar") || lower.includes("estandar"))) {
    const opt = lower.includes("mambo") ? "mambo" : "estandar";
    await chooseDinner(today, opt);
    return {
      message: `🍲 ¡Marcada la cena opción **${opt === "mambo" ? "Cecotec Mambo" : "Estándar"}** para hoy!`,
      actionExecuted: {
        type: "dinner",
        description: `Cena elegida: ${opt}`,
      },
    };
  }

  // ── Heurística Rápida 6: Factura o Documento de Energía (Detección y Memoria) ──
  if ((lower.includes("factura") || lower.includes("contrato") || lower.includes("recibo")) && (lower.includes("luz") || lower.includes("gas") || lower.includes("naturgy") || lower.includes("kwh"))) {
    const parseRes = await parseEnergyBillText(clean);
    if (parseRes.success && parseRes.contract) {
      return {
        message: `⚡ **¡Factura/Tarifa analizada e incorporada a la memoria!**\n\n- **Servicio:** ${parseRes.contract.service === "electricity" ? "Electricidad (Luz)" : "Gas Natural"}\n- **Comercializadora:** ${parseRes.contract.provider || "Naturgy"}\n- **Tarifa:** ${parseRes.contract.tariff_name}\n- **Precio energía:** ${parseRes.contract.energy_price_kwh} €/kWh\n${parseRes.contract.power_p1_kw ? `- **Potencia P1:** ${parseRes.contract.power_p1_kw} €/kW día\n` : ""}${parseRes.contract.power_p2_kw ? `- **Potencia P2:** ${parseRes.contract.power_p2_kw} €/kW día\n` : ""}\n${parseRes.summary}\n\n*He actualizado los parámetros en el dashboard para recalcular las recomendaciones del coche, lavadora y calefacción.*`,
        actionExecuted: {
          type: "energy",
          description: `Tarifa actualizada: ${parseRes.contract.tariff_name} (${parseRes.contract.energy_price_kwh} €/kWh)`,
        },
      };
    }
  }

  // ── Heurística Rápida 7: Consulta rápida de optimización de coche, lavadora o calefacción ──
  if (
    lower.includes("cargar el coche") ||
    lower.includes("cargar coche") ||
    lower.includes("coche eléctrico") ||
    lower.includes("poner la lavadora") ||
    lower.includes("lavavajillas") ||
    lower.includes("calefacción") ||
    lower.includes("calefaccion") ||
    lower.includes("tarifa por uso") ||
    lower.includes("tarifa de luz") ||
    lower.includes("tarifa de gas")
  ) {
    const contracts = await getEnergyContracts();
    const snapToday = await daySnapshot(today);
    const recs = getEnergyRecommendations(contracts, snapToday.day);

    if (lower.includes("coche")) {
      return {
        message: `🚗 **Recomendación Coche Eléctrico (Naturgy Tarifa Por Uso):**\n\n- **Estado actual:** ${recs.ev.statusLabel} (${recs.periodInfo.name} ${recs.periodInfo.period})\n- **Mejor horario:** ${recs.ev.bestHours}\n- **Consejo:** ${recs.ev.tip}\n- **Coste estimado:** ${recs.ev.estimatedCost}\n\n*Con tu tarifa el precio de energía es plano 24h (~${recs.electricityContract?.energy_price_kwh ?? 0.123} €/kWh), por lo que la clave es evitar sobrepasar la potencia diurna.*`,
        actionExecuted: { type: "energy", description: "Consulta de recarga de coche eléctrico" },
      };
    }

    if (lower.includes("lavadora") || lower.includes("lavavajillas") || lower.includes("secadora")) {
      return {
        message: `🧺 **Recomendación Electrodomésticos (Naturgy Tarifa Por Uso):**\n\n- **Lavadora:** ${recs.washer.statusLabel}\n- **Horarios despejados:** ${recs.washer.bestHours}\n- **Horarios a evitar:** 13:30 a 15:00 y 20:30 a 22:30 (pico de preparación de comidas en la cocina)\n- **Coste estimado:** ${recs.washer.estimatedCost}\n\n💡 *Tip de ahorro: Lavar a 30°C o en modo ECO gasta la mitad de kWh sin perder eficacia.*`,
        actionExecuted: { type: "energy", description: "Consulta de horario de lavadora/electrodomésticos" },
      };
    }

    if (lower.includes("calefacción") || lower.includes("calefaccion") || lower.includes("gas") || lower.includes("caldera")) {
      return {
        message: `♨️ **Recomendación Calefacción de Gas (Naturgy Tarifa Por Uso Gas):**\n\n- **Temperatura diurna recomendada:** 19,5°C – 20,5°C\n- **Temperatura nocturna:** 17,5°C (no apagues del todo para no perder la inercia térmica en Salamanca)\n- **Ventilación óptima:** De 13:00 a 15:00 durante 10 minutos (con sol y máxima temperatura exterior)\n- **Coste estimado caldera:** ${recs.heating.estimatedCost}\n\n${recs.heating.tip}`,
        actionExecuted: { type: "energy", description: "Consulta de optimización de calefacción de gas" },
      };
    }
  }

  // ── Análisis Inteligente con LLM (Action Tool Calling o respuesta de conocimiento) ──
  const target = parseRelativeDay(clean, today) ?? today;
  const [snap, week, menu] = await Promise.all([
    daySnapshot(target),
    getEventsBetween(today, addDays(today, 8)),
    getSchoolMenuRange(today, addDays(today, 7)),
  ]);

  const name = (id: number | null) => members.find((m) => m.id === id)?.name ?? "";
  const weekText =
    week.map((e) => `${e.starts_at.slice(0, 10)} ${e.all_day ? "" : timeOf(e.starts_at)} ${e.title} ${name(e.member_id)}`).join("\n") || "nada";
  const menuText = menu.map((m) => `${m.date}: ${m.lunch} (Cena sugerida *: ${m.dinner_recommendation || "general"})`).join("\n") || "sin datos";

  const systemPrompt =
    "Eres el Asistente Inteligente y Segundo Cerebro del hogar de Kike, Lara, Fabio (nacido en sept 2023) y Bruno (nacido en mayo 2025) en Salamanca. " +
    "Puedes tanto responder dudas como ejecutar acciones en el dashboard. " +
    "Si el usuario pide realizar una acción que no haya sido ejecutada, puedes responder con un bloque JSON al inicio con formato:\n" +
    '{"action": "add_shopping"|"update_pantry"|"add_task"|"update_energy_tariff", "params": {...}}\n\n' +
    `Hoy es ${today}.\n\n` +
    `## Datos de la casa (incluye tarifas Naturgy, clima y recomendaciones):\n${snapshotText(snap)}\n\n` +
    `## Agenda 7 días:\n${weekText}\n\n` +
    `## Menú del cole Montessori:\n${menuText}\n\n` +
    "Responde siempre en español, con tono cercano, eficiente, cariñoso y muy familiar. Si te preguntan por energía, coche eléctrico o calefacción, utiliza los datos exactos de las Tarifas Por Uso de Naturgy de la casa.";

  const aiResp = await llm(
    [
      { role: "system", content: systemPrompt },
      ...history.slice(-4),
      { role: "user", content: clean },
    ],
    { timeoutMs: 45_000, temperature: 0.3 },
  );

  if (!aiResp) {
    return {
      message: "⚠️ Lo siento, no he podido procesar la instrucción en este momento. Puedes usar los botones del dashboard directamente.",
    };
  }

  // Comprobar si el LLM devolvió una acción JSON
  const actionJson = parseJson<{ action: string; params: any }>(aiResp);
  if (actionJson && actionJson.action) {
    if (actionJson.action === "add_shopping" && actionJson.params?.name) {
      await addShopping(actionJson.params.name, { storeId: actionJson.params.storeId });
      return {
        message: `🛒 Añadido **${actionJson.params.name}** a la lista de la compra.`,
        actionExecuted: { type: "shopping", description: actionJson.params.name },
      };
    }
    if (actionJson.action === "update_energy_tariff" && actionJson.params?.service && typeof actionJson.params?.energy_price_kwh === "number") {
      await upsertEnergyContract({
        service: actionJson.params.service,
        provider: actionJson.params.provider || "Naturgy",
        tariff_name: actionJson.params.tariff_name || (actionJson.params.service === "electricity" ? "Tarifa Por Uso Luz" : "Tarifa Por Uso Gas"),
        energy_price_kwh: actionJson.params.energy_price_kwh,
        power_p1_kw: actionJson.params.power_p1_kw,
        power_p2_kw: actionJson.params.power_p2_kw,
        fixed_monthly_price: actionJson.params.fixed_monthly_price,
        notes: `Actualizado por chat el ${new Date().toLocaleDateString("es-ES")}`,
      });
      return {
        message: `⚡ He actualizado la tarifa de **${actionJson.params.service === "electricity" ? "electricidad" : "gas"}** a **${actionJson.params.energy_price_kwh} €/kWh** en la memoria del hogar.`,
        actionExecuted: {
          type: "energy",
          description: `Tarifa ${actionJson.params.service}: ${actionJson.params.energy_price_kwh} €/kWh`,
        },
      };
    }
  }

  return {
    message: aiResp,
    actionExecuted: undefined,
  };
}

export async function askAssistant(question: string, history: ChatMsg[] = []): Promise<string> {
  const res = await runAgentInstruction(question, history);
  return res.message;
}
