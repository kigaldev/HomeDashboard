import "server-only";
import { daySnapshot, snapshotText } from "./context";
import { addDays, isoDate, parseRelativeDay, timeOf } from "./dates";
import { llm, llmWithTools, llmToolFollowUp, parseJson, type ChatMsg, type ToolDeclaration, type LLMToolCall } from "./llm";
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
  addEvent,
  updateEvent,
  deleteEvent,
  findEventsByQuery,
  findTasksByQuery,
  completeTaskByQuery,
  deleteTaskByQuery,
  checkShoppingItemByName,
  getShopping,
  getPantry,
  recordManualExpense,
} from "./repo";
import { getEnergyRecommendations, parseEnergyBillText } from "./energy";

export type AgentActionResult = {
  message: string;
  actionExecuted?: {
    type: "calendar" | "task" | "shopping" | "pantry" | "school_run" | "dinner" | "energy" | "expense" | "info";
    description: string;
    ok: boolean;
    details?: Record<string, any>;
  };
};

/**
 * Catálogo formal de Tools / Function Declarations para el agente JARVIS familiar.
 * Basado en la especificación nativa de Google Gemini Function Calling.
 */
export const JARVIS_TOOLS: ToolDeclaration[] = [
  {
    name: "create_calendar_event",
    description: "Crea un nuevo evento en la agenda o calendario familiar (citas médicas, cumpleaños, reuniones, tutorías, etc.)",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Título o descripción clara del evento" },
        date: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
        time: { type: "STRING", description: "Hora de inicio en formato HH:mm (ej: '17:30'). Omitir si es todo el día" },
        member_name: { type: "STRING", description: "Nombre de la persona asignada: 'Kike', 'Lara', 'Fabio', 'Bruno' o 'Familia'" },
        location: { type: "STRING", description: "Lugar o ubicación del evento" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "update_calendar_event",
    description: "Modifica o reprograma un evento existente en la agenda familiar (cambiar fecha, hora, título, persona o lugar)",
    parameters: {
      type: "OBJECT",
      properties: {
        search_title: { type: "STRING", description: "Texto del título del evento a buscar y modificar" },
        new_date: { type: "STRING", description: "Nueva fecha en formato YYYY-MM-DD si cambia de día" },
        new_time: { type: "STRING", description: "Nueva hora en formato HH:mm si cambia de hora" },
        new_title: { type: "STRING", description: "Nuevo título si se desea cambiar" },
        new_member_name: { type: "STRING", description: "Nuevo miembro asignado ('Kike', 'Lara', 'Fabio', 'Bruno')" },
        new_location: { type: "STRING", description: "Nueva ubicación" },
      },
      required: ["search_title"],
    },
  },
  {
    name: "delete_calendar_event",
    description: "Elimina o cancela un evento de la agenda familiar",
    parameters: {
      type: "OBJECT",
      properties: {
        search_title: { type: "STRING", description: "Texto del título del evento a cancelar o eliminar" },
      },
      required: ["search_title"],
    },
  },
  {
    name: "get_calendar_events",
    description: "Consulta los eventos de la agenda familiar para un periodo o día determinado",
    parameters: {
      type: "OBJECT",
      properties: {
        start_date: { type: "STRING", description: "Fecha inicial en formato YYYY-MM-DD" },
        end_date: { type: "STRING", description: "Fecha final en formato YYYY-MM-DD (opcional)" },
      },
      required: ["start_date"],
    },
  },
  {
    name: "create_task",
    description: "Crea una nueva tarea pendiente en la lista del hogar",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Descripción de la tarea" },
        assignee_name: { type: "STRING", description: "'Kike', 'Lara' o 'Ambos'" },
        due_date: { type: "STRING", description: "Fecha límite en formato YYYY-MM-DD" },
        recurrence: { type: "STRING", enum: ["daily", "weekly", "monthly"], description: "Recurrencia periódica opcional" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Marca una tarea pendiente como hecha / realizada / completada",
    parameters: {
      type: "OBJECT",
      properties: {
        search_title: { type: "STRING", description: "Nombre o parte del título de la tarea a tachar o completar" },
      },
      required: ["search_title"],
    },
  },
  {
    name: "delete_task",
    description: "Elimina una tarea de la lista de tareas del hogar",
    parameters: {
      type: "OBJECT",
      properties: {
        search_title: { type: "STRING", description: "Nombre o parte del título de la tarea a eliminar" },
      },
      required: ["search_title"],
    },
  },
  {
    name: "get_tasks",
    description: "Consulta las tareas pendientes del hogar",
    parameters: {
      type: "OBJECT",
      properties: {
        assignee_name: { type: "STRING", description: "Filtrar por 'Kike', 'Lara' o null para todas" },
      },
    },
  },
  {
    name: "add_shopping_items",
    description: "Añade uno o varios productos a la lista de la compra del hogar",
    parameters: {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Lista de productos a comprar (ej: ['leche entera', 'huevos camperos', 'pañales'])",
        },
        store_name: {
          type: "STRING",
          description: "Tienda preferida ('Mercadona', 'Carrefour', 'Lidl', 'Farmacia' o null)",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "mark_shopping_items_bought",
    description: "Marca uno o varios productos de la lista de la compra como ya comprados o adquiridos",
    parameters: {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Lista de nombres de productos que ya se han comprado",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "get_shopping_list",
    description: "Consulta los productos pendientes en la lista de la compra",
    parameters: {
      type: "OBJECT",
      properties: {
        store_name: { type: "STRING", description: "Filtrar por tienda opcional" },
      },
    },
  },
  {
    name: "update_pantry",
    description: "Actualiza el estado de un alimento en la despensa ('ok', 'low' [queda poco] o 'out' [agotado/gastado])",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Nombre del producto en la despensa" },
        status: { type: "STRING", enum: ["ok", "low", "out"], description: "Estado: 'ok', 'low' o 'out'" },
      },
      required: ["name", "status"],
    },
  },
  {
    name: "get_pantry_items",
    description: "Consulta el inventario de la despensa o alimentos agotados",
    parameters: {
      type: "OBJECT",
      properties: {
        filter: { type: "STRING", enum: ["all", "low_or_out", "out"], description: "Filtro de estado" },
      },
    },
  },
  {
    name: "set_school_run",
    description: "Asigna quién lleva y quién recoge a Fabio del colegio Montessori",
    parameters: {
      type: "OBJECT",
      properties: {
        date: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
        dropoff_member: { type: "STRING", description: "Quién lleva a Fabio: 'Kike', 'Lara' o null" },
        pickup_member: { type: "STRING", description: "Quién recoge a Fabio: 'Kike', 'Lara' o null" },
        note: { type: "STRING", description: "Nota explicativa opcional" },
      },
      required: ["date"],
    },
  },
  {
    name: "set_dinner",
    description: "Establece o cambia la cena familiar para una fecha (Cecotec Mambo o Estándar)",
    parameters: {
      type: "OBJECT",
      properties: {
        date: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
        option: { type: "STRING", enum: ["mambo", "estandar"], description: "'mambo' o 'estandar'" },
      },
      required: ["date", "option"],
    },
  },
  {
    name: "update_energy_tariff",
    description: "Actualiza tarifas o precios de luz o gas en la memoria de la casa",
    parameters: {
      type: "OBJECT",
      properties: {
        service: { type: "STRING", enum: ["electricity", "gas"] },
        energy_price_kwh: { type: "NUMBER", description: "Precio de la energía en €/kWh" },
        provider: { type: "STRING", description: "Comercializadora (ej: Naturgy)" },
        tariff_name: { type: "STRING", description: "Nombre de la tarifa" },
        power_p1_kw: { type: "NUMBER" },
        power_p2_kw: { type: "NUMBER" },
        fixed_monthly_price: { type: "NUMBER" },
      },
      required: ["service", "energy_price_kwh"],
    },
  },
  {
    name: "create_expense",
    description: "Registra un gasto manual en la economía familiar (restaurante, ocio, suministros, farmacia, compras fuera de ticket, etc.) y lo incorpora de inmediato a los totales y desglose de gastos del hogar",
    parameters: {
      type: "OBJECT",
      properties: {
        concept: { type: "STRING", description: "Concepto o descripción del gasto (ej: 'Comida restaurante', 'Gasolina Repsol', 'Medicamentos Farmacia')" },
        amount: { type: "NUMBER", description: "Importe positivo del gasto en euros (ej: 50.0)" },
        category: {
          type: "STRING",
          description: "Categoría de gasto: 'Restaurante', 'Fruta y Verdura', 'Carnicería', 'Pescadería', 'Lácteos', 'Huevos', 'Panadería', 'Despensa', 'Bebé / Higiene', 'Salud / Farmacia', 'Transporte', 'Ocio', 'Otros'",
        },
        store_name: { type: "STRING", description: "Nombre del establecimiento o comercio (ej: 'Restaurante El Laurel', 'Repsol', 'Farmacia', 'Mercadona', 'Carrefour')" },
        date: { type: "STRING", description: "Fecha del gasto en formato YYYY-MM-DD. Omitir si es hoy" },
      },
      required: ["concept", "amount"],
    },
  },
];

/**
 * Resuelve un nombre de persona familiar a su ID en la base de datos.
 */
function resolveMemberId(name: string | undefined | null, members: { id: number; name: string }[]): number | null {
  if (!name) return null;
  const low = name.toLowerCase().trim();
  const found = members.find((m) => m.name.toLowerCase() === low || low.includes(m.name.toLowerCase()));
  return found?.id ?? null;
}

/**
 * Resuelve una tienda comercial por nombre.
 */
function resolveStoreId(name: string | undefined | null, stores: { id: number; name: string }[]): number | null {
  if (!name) return null;
  const low = name.toLowerCase().trim();
  const found = stores.find((s) => s.name.toLowerCase().includes(low) || low.includes(s.name.toLowerCase()));
  return found?.id ?? null;
}

/**
 * Ejecutor determinista de herramientas JARVIS.
 * Ejecuta la acción en la base de datos de la app y devuelve el resultado estructurado.
 */
async function executeJarvisToolCall(
  toolCall: LLMToolCall,
  today: string,
  members: { id: number; name: string }[],
  stores: { id: number; name: string }[],
): Promise<{
  success: boolean;
  message: string;
  actionExecuted: AgentActionResult["actionExecuted"];
  data?: any;
}> {
  const args = toolCall.args || {};

  switch (toolCall.name) {
    case "create_calendar_event": {
      const title = String(args.title || "").trim();
      const rawDate = String(args.date || "").trim();
      const eventDate = parseRelativeDay(rawDate, today) ?? rawDate ?? today;
      const time = args.time ? String(args.time).trim() : null;
      const memberId = resolveMemberId(args.member_name, members);
      const location = args.location ? String(args.location).trim() : null;
      const memberName = members.find((m) => m.id === memberId)?.name || (args.member_name ? String(args.member_name) : "Familia");

      await addEvent({
        title,
        date: eventDate,
        time,
        memberId,
        location,
      });

      const timeText = time ? ` a las ${time}` : " (todo el día)";
      const locText = location ? ` en ${location}` : "";
      return {
        success: true,
        message: `📅 He añadido a la agenda: **"${title}"** para **${memberName}** el **${eventDate}**${timeText}${locText}.`,
        actionExecuted: {
          type: "calendar",
          description: `Agenda: ${title} (${eventDate}${time ? ` ${time}` : ""}) para ${memberName}`,
          ok: true,
          details: { title, date: eventDate, time, memberName, location },
        },
      };
    }

    case "update_calendar_event": {
      const searchTitle = String(args.search_title || "").trim();
      const foundEvents = await findEventsByQuery(searchTitle, today);
      const target = foundEvents[0] || (await findEventsByQuery(searchTitle))[0];

      if (!target) {
        return {
          success: false,
          message: `⚠️ No he encontrado ningún evento en la agenda que coincida con **"${searchTitle}"**. Puedes comprobar la pestaña Familia para ver los eventos actuales.`,
          actionExecuted: {
            type: "calendar",
            description: `Búsqueda sin resultado: "${searchTitle}"`,
            ok: false,
          },
        };
      }

      const newDate = args.new_date ? (parseRelativeDay(String(args.new_date), today) ?? String(args.new_date)) : undefined;
      const newTime = args.new_time !== undefined ? (args.new_time ? String(args.new_time).trim() : null) : undefined;
      const newTitle = args.new_title ? String(args.new_title).trim() : undefined;
      const newMemberId = args.new_member_name !== undefined ? resolveMemberId(args.new_member_name, members) : undefined;
      const newLoc = args.new_location !== undefined ? String(args.new_location).trim() : undefined;

      await updateEvent(target.id, {
        title: newTitle,
        date: newDate,
        time: newTime,
        memberId: newMemberId,
        location: newLoc,
      });

      const updatedTitle = newTitle || target.title;
      const updatedDate = newDate || target.starts_at.slice(0, 10);
      const changesDesc: string[] = [];
      if (newDate) changesDesc.push(`fecha: ${newDate}`);
      if (newTime) changesDesc.push(`hora: ${newTime}`);
      if (newTitle) changesDesc.push(`título: "${newTitle}"`);

      return {
        success: true,
        message: `📅 Evento modificado en la agenda: **"${updatedTitle}"** reprogramado para el **${updatedDate}**${newTime ? ` a las ${newTime}` : ""}.`,
        actionExecuted: {
          type: "calendar",
          description: `Modificado evento: "${target.title}" → ${changesDesc.join(", ") || "actualizado"}`,
          ok: true,
          details: { id: target.id, title: updatedTitle, date: updatedDate, time: newTime },
        },
      };
    }

    case "delete_calendar_event": {
      const searchTitle = String(args.search_title || "").trim();
      const foundEvents = await findEventsByQuery(searchTitle);
      const target = foundEvents[0];

      if (!target) {
        return {
          success: false,
          message: `⚠️ No he encontrado el evento **"${searchTitle}"** en la agenda para cancelarlo.`,
          actionExecuted: {
            type: "calendar",
            description: `Evento no encontrado: "${searchTitle}"`,
            ok: false,
          },
        };
      }

      await deleteEvent(target.id);
      return {
        success: true,
        message: `🗑️ He cancelado y eliminado de la agenda el evento: **"${target.title}"** (${target.starts_at.slice(0, 10)}).`,
        actionExecuted: {
          type: "calendar",
          description: `Cancelado evento de agenda: "${target.title}"`,
          ok: true,
        },
      };
    }

    case "get_calendar_events": {
      const startDate = args.start_date ? (parseRelativeDay(String(args.start_date), today) ?? String(args.start_date)) : today;
      const endDate = args.end_date ? (parseRelativeDay(String(args.end_date), today) ?? String(args.end_date)) : addDays(startDate, 7);
      const events = await getEventsBetween(startDate, endDate);

      const list = events.map((e) => `• **${e.starts_at.slice(0, 10)}** ${e.all_day ? "" : timeOf(e.starts_at)}: ${e.title}`).join("\n");
      return {
        success: true,
        message: events.length > 0
          ? `📅 **Eventos previstos del ${startDate} al ${endDate}:**\n\n${list}`
          : `📅 No hay eventos previstos en la agenda familiar entre el ${startDate} y el ${endDate}.`,
        actionExecuted: {
          type: "info",
          description: `Consulta de agenda (${events.length} eventos)`,
          ok: true,
        },
        data: events,
      };
    }

    case "create_task": {
      const title = String(args.title || "").trim();
      const assigneeId = resolveMemberId(args.assignee_name, members);
      const rawDue = args.due_date ? String(args.due_date).trim() : null;
      const dueDate = rawDue ? (parseRelativeDay(rawDue, today) ?? rawDue) : null;
      const recurrence = args.recurrence || null;
      const assigneeName = members.find((m) => m.id === assigneeId)?.name || "Cualquiera";

      await addTask(title, assigneeId, dueDate, recurrence);
      const dueText = dueDate ? ` para el **${dueDate}**` : "";
      return {
        success: true,
        message: `✅ Tarea creada: **"${title}"** asignada a **${assigneeName}**${dueText}.`,
        actionExecuted: {
          type: "task",
          description: `Tarea creada: ${title} (${assigneeName})`,
          ok: true,
          details: { title, assigneeName, dueDate },
        },
      };
    }

    case "complete_task": {
      const searchTitle = String(args.search_title || "").trim();
      const res = await completeTaskByQuery(searchTitle);
      if (!res.success || !res.task) {
        return {
          success: false,
          message: `⚠️ No he encontrado ninguna tarea pendiente que coincida con **"${searchTitle}"**.`,
          actionExecuted: {
            type: "task",
            description: `Tarea no encontrada: "${searchTitle}"`,
            ok: false,
          },
        };
      }
      return {
        success: true,
        message: `🎉 ¡Tarea completada!: **"${res.task.title}"** marcada como realizada en la app.`,
        actionExecuted: {
          type: "task",
          description: `Completada tarea: "${res.task.title}"`,
          ok: true,
        },
      };
    }

    case "delete_task": {
      const searchTitle = String(args.search_title || "").trim();
      const res = await deleteTaskByQuery(searchTitle);
      if (!res.success || !res.task) {
        return {
          success: false,
          message: `⚠️ No he encontrado la tarea **"${searchTitle}"** para eliminarla.`,
          actionExecuted: {
            type: "task",
            description: `Tarea no encontrada: "${searchTitle}"`,
            ok: false,
          },
        };
      }
      return {
        success: true,
        message: `🗑️ Tarea eliminada: **"${res.task.title}"**.`,
        actionExecuted: {
          type: "task",
          description: `Eliminada tarea: "${res.task.title}"`,
          ok: true,
        },
      };
    }

    case "get_tasks": {
      const allTasks = await getOpenTasks();
      const filtered = args.assignee_name
        ? allTasks.filter((t) => {
            const mId = resolveMemberId(args.assignee_name, members);
            return t.assignee_id === mId;
          })
        : allTasks;

      const name = (id: number | null) => members.find((m) => m.id === id)?.name ?? "Ambos";
      const list = filtered.map((t) => `• ${t.title} (${name(t.assignee_id)})${t.due_date ? ` · límite: ${t.due_date}` : ""}`).join("\n");
      return {
        success: true,
        message: filtered.length > 0
          ? `📝 **Tareas pendientes (${filtered.length}):**\n\n${list}`
          : `🎉 No hay tareas pendientes en este momento. ¡Todo al día!`,
        actionExecuted: {
          type: "info",
          description: `Consulta de tareas (${filtered.length} pendientes)`,
          ok: true,
        },
        data: filtered,
      };
    }

    case "add_shopping_items": {
      const rawItems: string[] = Array.isArray(args.items) ? args.items : [String(args.items || "")];
      const items = rawItems.map((s) => String(s).trim()).filter((s) => s.length > 0);
      const storeId = resolveStoreId(args.store_name, stores);
      const storeName = stores.find((s) => s.id === storeId)?.name || (args.store_name ? String(args.store_name) : "");

      for (const item of items) {
        await addShopping(item, { storeId });
      }

      const destText = storeName ? ` en **${storeName}**` : "";
      return {
        success: true,
        message: `🛒 ¡Hecho! Añadido(s) a la lista de la compra${destText}: **${items.join(", ")}**.`,
        actionExecuted: {
          type: "shopping",
          description: `Añadido a la compra: ${items.join(", ")}${storeName ? ` (${storeName})` : ""}`,
          ok: true,
          details: { items, storeName },
        },
      };
    }

    case "mark_shopping_items_bought": {
      const rawItems: string[] = Array.isArray(args.items) ? args.items : [String(args.items || "")];
      const items = rawItems.map((s) => String(s).trim()).filter((s) => s.length > 0);
      const marked: string[] = [];

      for (const item of items) {
        const res = await checkShoppingItemByName(item);
        if (res.matched && res.item) {
          marked.push(res.item.name);
        }
      }

      if (marked.length === 0) {
        return {
          success: false,
          message: `⚠️ No he encontrado en la lista de la compra los productos: **${items.join(", ")}** para marcarlos como comprados.`,
          actionExecuted: {
            type: "shopping",
            description: `Productos no encontrados en lista: ${items.join(", ")}`,
            ok: false,
          },
        };
      }

      return {
        success: true,
        message: `✅ ¡Comprado! He tachado de la lista de la compra: **${marked.join(", ")}** y repuesto el stock en la despensa.`,
        actionExecuted: {
          type: "shopping",
          description: `Marcado como comprado: ${marked.join(", ")}`,
          ok: true,
          details: { marked },
        },
      };
    }

    case "get_shopping_list": {
      const allShopping = await getShopping();
      const pending = allShopping.filter((i) => !i.checked);
      const storeFiltered = args.store_name
        ? pending.filter((i) => {
            const sId = resolveStoreId(args.store_name, stores);
            return i.store_id === sId;
          })
        : pending;

      const list = storeFiltered.map((i) => `• ${i.name}`).join("\n");
      return {
        success: true,
        message: storeFiltered.length > 0
          ? `🛒 **Lista de la compra (${storeFiltered.length} productos):**\n\n${list}`
          : `🛒 La lista de la compra está vacía. ¡No falta nada!`,
        actionExecuted: {
          type: "info",
          description: `Consulta de compra (${storeFiltered.length} artículos)`,
          ok: true,
        },
        data: storeFiltered,
      };
    }

    case "update_pantry": {
      const name = String(args.name || "").trim();
      const status = (args.status === "low" || args.status === "out" ? args.status : "ok") as "ok" | "low" | "out";
      await setPantry(name, status);

      const statusLabels = {
        ok: "en stock (OK)",
        low: "quedando poco",
        out: "agotado",
      };

      const extra = status !== "ok" ? " y lo he anotado en la lista de la compra para reponerlo" : "";
      return {
        success: true,
        message: `📦 Entendido. He actualizado **${name}** en la despensa como *${statusLabels[status]}*${extra}.`,
        actionExecuted: {
          type: "pantry",
          description: `Despensa: ${name} marcado como ${status}`,
          ok: true,
          details: { name, status },
        },
      };
    }

    case "get_pantry_items": {
      const pantry = await getPantry();
      let filtered = pantry;
      if (args.filter === "low_or_out") {
        filtered = pantry.filter((p) => p.status === "low" || p.status === "out");
      } else if (args.filter === "out") {
        filtered = pantry.filter((p) => p.status === "out");
      }

      const list = filtered.map((p) => `• **${p.name}**: ${p.status === "out" ? "🔴 Agotado" : p.status === "low" ? "🟡 Queda poco" : "🟢 OK"}`).join("\n");
      return {
        success: true,
        message: filtered.length > 0
          ? `📦 **Estado de la despensa (${filtered.length} productos):**\n\n${list}`
          : `📦 No hay productos con ese criterio en la despensa.`,
        actionExecuted: {
          type: "info",
          description: `Consulta de despensa (${filtered.length} productos)`,
          ok: true,
        },
        data: filtered,
      };
    }

    case "set_school_run": {
      const rawDate = String(args.date || "").trim();
      const targetDate = parseRelativeDay(rawDate, today) ?? rawDate ?? today;
      const dropoffId = resolveMemberId(args.dropoff_member, members);
      const pickupId = resolveMemberId(args.pickup_member, members);
      const note = args.note ? String(args.note).trim() : `Actualizado por JARVIS`;

      await setSchoolRunOverride(targetDate, dropoffId, pickupId, note);
      const dropName = members.find((m) => m.id === dropoffId)?.name || "Sin asignar";
      const pickName = members.find((m) => m.id === pickupId)?.name || "Sin asignar";

      return {
        success: true,
        message: `🏫 ¡Turno del cole actualizado para el **${targetDate}**!\n- **Lleva a Fabio:** ${dropName}\n- **Lo recoge:** ${pickName}`,
        actionExecuted: {
          type: "school_run",
          description: `Cole ${targetDate}: lleva ${dropName}, recoge ${pickName}`,
          ok: true,
          details: { targetDate, dropName, pickName },
        },
      };
    }

    case "set_dinner": {
      const rawDate = String(args.date || "").trim();
      const targetDate = parseRelativeDay(rawDate, today) ?? rawDate ?? today;
      const opt = args.option === "mambo" ? "mambo" : "estandar";

      await chooseDinner(targetDate, opt);
      const optLabel = opt === "mambo" ? "Cecotec Mambo" : "Estándar";
      return {
        success: true,
        message: `🍲 ¡Marcada la cena opción **${optLabel}** para el **${targetDate}**!`,
        actionExecuted: {
          type: "dinner",
          description: `Cena elegida para ${targetDate}: ${optLabel}`,
          ok: true,
          details: { date: targetDate, option: opt },
        },
      };
    }

    case "update_energy_tariff": {
      const service = args.service === "gas" ? "gas" : "electricity";
      const price = Number(args.energy_price_kwh) || 0;
      await upsertEnergyContract({
        service,
        provider: args.provider || "Naturgy",
        tariff_name: args.tariff_name || (service === "electricity" ? "Tarifa Por Uso Luz" : "Tarifa Por Uso Gas"),
        energy_price_kwh: price,
        power_p1_kw: args.power_p1_kw,
        power_p2_kw: args.power_p2_kw,
        fixed_monthly_price: args.fixed_monthly_price,
        notes: `Actualizado por JARVIS el ${new Date().toLocaleDateString("es-ES")}`,
      });

      return {
        success: true,
        message: `⚡ Tarifa de **${service === "electricity" ? "electricidad" : "gas"}** actualizada a **${price} €/kWh** en la memoria del hogar.`,
        actionExecuted: {
          type: "energy",
          description: `Tarifa ${service}: ${price} €/kWh`,
          ok: true,
          details: { service, price },
        },
      };
    }

    case "create_expense": {
      const concept = String(args.concept || "Gasto manual").trim();
      const amount = Math.abs(Number(args.amount) || 0);
      if (amount <= 0) {
        return {
          success: false,
          message: "⚠️ El importe del gasto debe ser un número positivo en euros.",
          actionExecuted: undefined,
        };
      }
      const rawDate = args.date ? String(args.date).trim() : today;
      const targetDate = parseRelativeDay(rawDate, today) ?? rawDate ?? today;
      const storeName = args.store_name ? String(args.store_name).trim() : undefined;
      const category = args.category ? String(args.category).trim() : undefined;

      const res = await recordManualExpense({
        concept,
        amount,
        category,
        date: targetDate,
        storeName,
      });

      return {
        success: true,
        message: `💶 ¡Gasto registrado!: **${res.totalAmount.toFixed(2)} €** en concepto de **"${concept}"** clasificado en **${res.category}**${res.storeName ? ` (${res.storeName})` : ""}.\n\nYa aparece reflejado en el desglose de gastos y presupuesto mensual de la app.`,
        actionExecuted: {
          type: "expense",
          description: `Gasto: ${res.totalAmount.toFixed(2)} € - ${concept} (${res.category})`,
          ok: true,
          details: res,
        },
        data: res,
      };
    }

    default:
      return {
        success: false,
        message: `Función no reconocida: ${toolCall.name}`,
        actionExecuted: undefined,
      };
  }
}

/**
 * Agente JARVIS del Hogar.
 * Orquesta la comprensión y ejecución en tiempo real mediante Function Calling nativo
 * y heurísticas ultrarrápidas de alta fidelidad.
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

  // ── Heurística Rápida 0: Gasto Manual (ej. "incluye un gasto de 50€ con concepto comida restaurante") ──
  const expenseRegex = /(?:incluye|añade|agrega|apunta|registra|mete)?\s*(?:un\s+)?gasto\s+(?:de\s+)?([\d.,]+)\s*(?:€|euros?)\s*(?:con\s+concepto|en\s+concepto\s+de|en|de|para)?\s*(.+)/i;
  const expenseMatch = lower.match(expenseRegex);
  if (expenseMatch) {
    const rawAmt = expenseMatch[1].replace(",", ".");
    const amount = parseFloat(rawAmt);
    let concept = expenseMatch[2].trim();
    if (!isNaN(amount) && amount > 0 && concept.length > 0) {
      let storeName: string | undefined = undefined;
      for (const st of stores) {
        if (concept.toLowerCase().includes(st.name.toLowerCase())) {
          storeName = st.name;
          break;
        }
      }

      const res = await recordManualExpense({
        concept,
        amount,
        date: today,
        storeName,
      });

      return {
        message: `💶 ¡Anotado y registrado en la app! He guardado un gasto de **${res.totalAmount.toFixed(2)} €** con concepto **"${concept}"** clasificado en la categoría **${res.category}**${res.storeName ? ` (${res.storeName})` : ""}.\n\nYa aparece actualizado en el desglose de gastos y presupuesto del hogar.`,
        actionExecuted: {
          type: "expense",
          description: `Gasto: ${res.totalAmount.toFixed(2)} € - ${concept} (${res.category})`,
          ok: true,
          details: res,
        },
      };
    }
  }

  // ── Heurística Rápida 1: Compra directa (ej. "añade leche a mercadona", "comprar pañales") ──
  const isAppointmentOrTask = /(?:dentista|médico|medico|pediatra|cita|reunión|reunion|cumpleaños|cumple|partido|entrenamiento|veterinario|tutoría|tutoria|agenda|evento|tarea|recordar|cole)/i.test(lower);
  const shoppingMatch = lower.match(/(?:añade|agrega|mete|apunta|comprar|compra)\s+(?:a la compra\s+)?(.+)/i);
  if (shoppingMatch && !isAppointmentOrTask && !lower.includes("cena")) {
    let rawItem = shoppingMatch[1].trim();
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

    const items = rawItem
      .split(/,|\by\b|\be\b/i)
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
          description: `Añadido a la compra: ${items.join(", ")}${storeName ? ` (${storeName})` : ""}`,
          ok: true,
          details: { items, storeName },
        },
      };
    }
  }

  // ── Heurística Rápida 2: Despensa / Se ha terminado (ej. "se ha acabado la leche") ──
  const pantryOutMatch = lower.match(/(?:se ha(?:n)? (?:acabado|terminado|gastado)|no queda(?:n)?|queda poco de|falta)\s+(.+)/i);
  if (pantryOutMatch && !lower.includes("tiempo") && !lower.includes("tarea")) {
    const itemName = pantryOutMatch[1]
      .replace(/^(?:el|la|los|las|un|una|unos|unas|de|del)\s+/i, "")
      .trim();
    const isLow = lower.includes("poco");
    const status = isLow ? "low" : "out";
    await setPantry(itemName, status);
    return {
      message: `📦 Entendido. He actualizado **${itemName}** en la despensa como *${isLow ? "quedando poco" : "agotado"}* y lo he puesto en la lista de la compra para reponerlo.`,
      actionExecuted: {
        type: "pantry",
        description: `Despensa: ${itemName} marcado como ${status}`,
        ok: true,
        details: { name: itemName, status },
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
          ok: true,
          details: { date: targetDate, dropName, pickName },
        },
      };
    }
  }

  // ── Heurística Rápida 4: Crear Tarea ──
  const taskMatch = lower.match(/(?:añade|crea|nueva)?\s*tarea(?:\s+para\s+(\w+))?[:\s]+(.+)/i);
  if (taskMatch && !lower.includes("agenda") && !lower.includes("evento")) {
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
        ok: true,
        details: { title: taskTitle, assigneeName: assignName, due },
      },
    };
  }

  // ── Heurística Rápida 5: Factura de Energía ──
  if ((lower.includes("factura") || lower.includes("contrato") || lower.includes("recibo")) && (lower.includes("luz") || lower.includes("gas") || lower.includes("naturgy") || lower.includes("kwh"))) {
    const parseRes = await parseEnergyBillText(clean);
    if (parseRes.success && parseRes.contract) {
      return {
        message: `⚡ **¡Factura/Tarifa analizada e incorporada a la memoria!**\n\n- **Servicio:** ${parseRes.contract.service === "electricity" ? "Electricidad (Luz)" : "Gas Natural"}\n- **Comercializadora:** ${parseRes.contract.provider || "Naturgy"}\n- **Tarifa:** ${parseRes.contract.tariff_name}\n- **Precio energía:** ${parseRes.contract.energy_price_kwh} €/kWh\n${parseRes.contract.power_p1_kw ? `- **Potencia P1:** ${parseRes.contract.power_p1_kw} €/kW día\n` : ""}${parseRes.contract.power_p2_kw ? `- **Potencia P2:** ${parseRes.contract.power_p2_kw} €/kW día\n` : ""}\n${parseRes.summary}\n\n*He actualizado los parámetros en el dashboard para recalcular las recomendaciones del coche, lavadora y calefacción.*`,
        actionExecuted: {
          type: "energy",
          description: `Tarifa actualizada: ${parseRes.contract.tariff_name} (${parseRes.contract.energy_price_kwh} €/kWh)`,
          ok: true,
          details: parseRes.contract,
        },
      };
    }
  }

  // ── Heurística Rápida 6: Consultas de Coche, Lavadora o Calefacción ──
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
        actionExecuted: { type: "energy", description: "Consulta de recarga de coche eléctrico", ok: true },
      };
    }

    if (lower.includes("lavadora") || lower.includes("lavavajillas") || lower.includes("secadora")) {
      return {
        message: `🧺 **Recomendación Electrodomésticos (Naturgy Tarifa Por Uso):**\n\n- **Lavadora:** ${recs.washer.statusLabel}\n- **Horarios despejados:** ${recs.washer.bestHours}\n- **Horarios a evitar:** 13:30 a 15:00 y 20:30 a 22:30 (pico de preparación de comidas en la cocina)\n- **Coste estimado:** ${recs.washer.estimatedCost}\n\n💡 *Tip de ahorro: Lavar a 30°C o en modo ECO gasta la mitad de kWh sin perder eficacia.*`,
        actionExecuted: { type: "energy", description: "Consulta de horario de lavadora/electrodomésticos", ok: true },
      };
    }

    if (lower.includes("calefacción") || lower.includes("calefaccion") || lower.includes("gas") || lower.includes("caldera")) {
      return {
        message: `♨️ **Recomendación Calefacción de Gas (Naturgy Tarifa Por Uso Gas):**\n\n- **Temperatura diurna recomendada:** 19,5°C – 20,5°C\n- **Temperatura nocturna:** 17,5°C (no apagues del todo para no perder la inercia térmica en Salamanca)\n- **Ventilación óptima:** De 13:00 a 15:00 durante 10 minutos (con sol y máxima temperatura exterior)\n- **Coste estimado caldera:** ${recs.heating.estimatedCost}\n\n${recs.heating.tip}`,
        actionExecuted: { type: "energy", description: "Consulta de optimización de calefacción de gas", ok: true },
      };
    }
  }

  // ── Contexto del Hogar para JARVIS ──
  const target = parseRelativeDay(clean, today) ?? today;
  const [snap, week, menu, tasks, shopping] = await Promise.all([
    daySnapshot(target),
    getEventsBetween(today, addDays(today, 8)),
    getSchoolMenuRange(today, addDays(today, 7)),
    getOpenTasks(),
    getShopping(),
  ]);

  const name = (id: number | null) => members.find((m) => m.id === id)?.name ?? "";
  const weekText =
    week.map((e) => `• ${e.starts_at.slice(0, 10)} ${e.all_day ? "" : timeOf(e.starts_at)}: ${e.title} (${name(e.member_id) || "Familia"})`).join("\n") || "Sin eventos";
  const menuText =
    menu.map((m) => `${m.date}: ${m.lunch} (Cena sugerida: ${m.dinner_recommendation || "general"})`).join("\n") || "Sin datos";
  const tasksText =
    tasks.slice(0, 8).map((t) => `• ${t.title} [${name(t.assignee_id)}]${t.due_date ? ` (${t.due_date})` : ""}`).join("\n") || "Ninguna pendiente";
  const shoppingText =
    shopping.filter((i) => !i.checked).slice(0, 10).map((i) => `• ${i.name}`).join(", ") || "Lista vacía";

  const systemPrompt = [
    "Eres JARVIS, el Asistente Inteligente del Hogar familiar de Kike, Lara, Fabio (nacido en sept 2023) y Bruno (nacido en mayo 2025) en Salamanca.",
    "Tienes control completo sobre la aplicación Home Dashboard a través de tus herramientas disponibles (tools / function declarations).",
    "Cuando el usuario te pida crear o modificar eventos en la agenda, añadir o completar tareas, añadir o tachar productos de la compra, registrar gastos familiares ('create_expense'), o actualizar la despensa, DEBES LLAMAR A LA HERRAMIENTA CORRESPONDIENTE.",
    "",
    `Hoy es ${today} (${new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}).`,
    "",
    `## Estado actual del Hogar:`,
    snapshotText(snap),
    "",
    `## Agenda próximos 7 días:`,
    weekText,
    "",
    `## Tareas pendientes:`,
    tasksText,
    "",
    `## Pendientes de compra:`,
    shoppingText,
    "",
    `## Menú escolar Montessori:`,
    menuText,
    "",
    "Responde siempre en español, con tono cercano, profesional, eficiente y muy familiar. Nunca inventes que has hecho algo si no has invocado la herramienta.",
  ].join("\n");

  const conversation: ChatMsg[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6),
    { role: "user", content: clean },
  ];

  // ── 1. Intentar con Native Function Calling (Gemini Tools) ──
  try {
    const toolRes = await llmWithTools(conversation, JARVIS_TOOLS, { timeoutMs: 30_000, temperature: 0.2 });

    if (toolRes && toolRes.toolCalls && toolRes.toolCalls.length > 0) {
      const primaryCall = toolRes.toolCalls[0];
      const executed = await executeJarvisToolCall(primaryCall, today, members, stores);

      // Si Gemini también devolvió pensamiento o texto, o podemos hacer follow-up
      if (primaryCall.rawPart) {
        const followUp = await llmToolFollowUp(
          conversation,
          JARVIS_TOOLS,
          primaryCall.rawPart,
          primaryCall.name,
          { success: executed.success, message: executed.message, action: executed.actionExecuted?.description }
        );
        if (followUp) {
          return {
            message: followUp,
            actionExecuted: executed.actionExecuted,
          };
        }
      }

      return {
        message: executed.message,
        actionExecuted: executed.actionExecuted,
      };
    }

    if (toolRes && toolRes.text) {
      return {
        message: toolRes.text,
        actionExecuted: undefined,
      };
    }
  } catch (err) {
    console.warn("[runAgentInstruction] Error en llmWithTools, pasando a fallback:", err);
  }

  // ── 2. Fallback: LLM estándar con formato de acción JSON o conversacional ──
  const fallbackPrompt =
    systemPrompt +
    "\n\nSi necesitas ejecutar una acción, incluye un bloque JSON al inicio con formato:\n" +
    '{"tool": "create_calendar_event"|"update_calendar_event"|"create_task"|"complete_task"|"add_shopping_items"|"mark_shopping_items_bought"|"update_pantry", "params": {...}}';

  const aiResp = await llm(
    [
      { role: "system", content: fallbackPrompt },
      ...history.slice(-4),
      { role: "user", content: clean },
    ],
    { timeoutMs: 35_000, temperature: 0.3 },
  );

  if (!aiResp) {
    return {
      message: "⚠️ Lo siento, no he podido conectar con el núcleo de JARVIS en este momento. Puedes usar los botones del dashboard directamente.",
    };
  }

  // Comprobar si devolvió un tool JSON
  const actionJson = parseJson<{ tool?: string; action?: string; params?: any }>(aiResp);
  if (actionJson) {
    const toolName = actionJson.tool || actionJson.action;
    if (toolName) {
      const executed = await executeJarvisToolCall(
        { name: toolName, args: actionJson.params || {} },
        today,
        members,
        stores
      );
      if (executed.actionExecuted) {
        return {
          message: executed.message,
          actionExecuted: executed.actionExecuted,
        };
      }
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
