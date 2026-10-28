"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  addShopping,
  toggleShopping,
  toggleInCart,
  setShoppingItemStore,
  batchUpdateShoppingStores,
  getShopping,
  getStores,
  deleteShopping,
  clearChecked,
  setPantry,
  addTask,
  toggleTask,
  deleteTask,
  addEvent,
  deleteEvent,
  setSchoolRunOverride,
  setSchoolMenu,
  addHealth,
  completeHealth,
  chooseDinner,
  updateMember,
  getMembers,
  getSetting,
  setSetting,
  createStaple,
  deleteStaple,
  toggleStapleByName,
  updateMemberPreference,
  setMemberPin,
  verifyMemberPin,
  type PantryItem,
  type Task,
} from "@/lib/repo";
import { ensureDinnerPlans } from "@/lib/dinners";
import { generateBriefing, type BriefingKind } from "@/lib/briefing";
import { askAssistant, runAgentInstruction, type AgentActionResult } from "@/lib/assistant";
import { generateSaturdayShoppingList } from "@/lib/weeklyShopping";
import { syncMontessoriMenu } from "@/lib/schoolMenu";
import { syncGoogleCalendars } from "@/lib/gcal";
import { optimizeShoppingBasket, type BasketOptimizationResult } from "@/lib/pricesProvider";
import {
  parseReceiptText,
  parseReceiptImage,
  saveProcessedReceipt,
  findMatchingShoppingItems,
  executeReceiptActions,
  type ParsedReceipt,
  type ReceiptReconciliationResult,
  type ParsedReceiptWithMatches,
  type ReceiptActionConfig,
  type ReceiptExecutionResult,
} from "@/lib/receipts";
import { markItemConsumed, ensureDemoReceipts, updateEnergyContract, upsertEnergyContract, type EnergyContract } from "@/lib/repo";
import { parseEnergyBillText, parseEnergyBillImage } from "@/lib/energy";

export async function addShoppingAction(formData: FormData) {
  const name = formData.get("name") as string;
  const storeIdStr = formData.get("storeId") as string;
  const quantity = formData.get("quantity") as string;
  const byStr = formData.get("by") as string;
  const storeId = storeIdStr ? parseInt(storeIdStr, 10) : null;

  let by: number | null = byStr ? parseInt(byStr, 10) : null;
  if (!by) {
    const cookieStore = await cookies();
    const activeMember = cookieStore.get("hd_active_member")?.value;
    if (activeMember) by = parseInt(activeMember, 10);
  }

  if (name?.trim()) {
    await addShopping(name, { storeId, quantity: quantity?.trim() || null, by });
    revalidatePath("/");
  }
}

export async function quickAddStapleAction(name: string, storeId: number | null) {
  const cookieStore = await cookies();
  const activeMember = cookieStore.get("hd_active_member")?.value;
  const by = activeMember ? parseInt(activeMember, 10) : null;
  await addShopping(name, { storeId, by });
  revalidatePath("/");
}

export async function toggleShoppingAction(id: number) {
  await toggleShopping(id);
  revalidatePath("/");
}

export async function toggleInCartAction(id: number) {
  await toggleInCart(id);
  revalidatePath("/");
}

export async function setShoppingItemStoreAction(id: number, storeId: number | null) {
  await setShoppingItemStore(id, storeId);
  revalidatePath("/");
}

export async function optimizeShoppingBasketAction(): Promise<BasketOptimizationResult> {
  const items = await getShopping();
  const stores = await getStores();
  return await optimizeShoppingBasket(items, stores);
}

export async function applyBasketOptimizationAction(assignments: { id: number; storeId: number }[]) {
  await batchUpdateShoppingStores(assignments);
  revalidatePath("/");
}

export async function deleteShoppingAction(id: number) {
  await deleteShopping(id);
  revalidatePath("/");
}

export async function clearCheckedShoppingAction() {
  await clearChecked();
  revalidatePath("/");
}

export async function setPantryStatusAction(name: string, status: PantryItem["status"]) {
  await setPantry(name, status);
  revalidatePath("/");
}

export async function addTaskAction(formData: FormData) {
  const title = formData.get("title") as string;
  const assigneeIdStr = formData.get("assigneeId") as string;
  const dueDate = (formData.get("dueDate") as string) || null;
  const recurrence = (formData.get("recurrence") as Task["recurrence"]) || null;
  const assigneeId = assigneeIdStr ? parseInt(assigneeIdStr, 10) : null;

  if (title?.trim()) {
    await addTask(title, assigneeId, dueDate, recurrence);
    revalidatePath("/");
  }
}

export async function toggleTaskAction(id: number) {
  await toggleTask(id);
  revalidatePath("/");
}

export async function deleteTaskAction(id: number) {
  await deleteTask(id);
  revalidatePath("/");
}

export async function addEventAction(formData: FormData) {
  const title = formData.get("title") as string;
  const date = formData.get("date") as string;
  const time = (formData.get("time") as string) || null;
  const memberIdStr = formData.get("memberId") as string;
  const location = (formData.get("location") as string) || null;
  const memberId = memberIdStr ? parseInt(memberIdStr, 10) : null;

  if (title?.trim() && date) {
    await addEvent({ title, date, time, memberId, location });
    revalidatePath("/");
  }
}

export async function deleteEventAction(id: number) {
  await deleteEvent(id);
  revalidatePath("/");
}

export async function chooseDinnerAction(date: string, option: string) {
  await chooseDinner(date, option);
  revalidatePath("/");
}

export async function regenerateDinnerAction(date: string) {
  await ensureDinnerPlans(date, true);
  revalidatePath("/");
}

export async function setSchoolRunOverrideAction(date: string, dropoffId: number | null, pickupId: number | null, note: string | null) {
  await setSchoolRunOverride(date, dropoffId, pickupId, note);
  revalidatePath("/");
}

export async function setSchoolMenuAction(date: string, lunch: string) {
  if (lunch?.trim()) {
    await setSchoolMenu(date, lunch.trim());
    revalidatePath("/");
  }
}

export async function addHealthAction(formData: FormData) {
  const memberIdStr = formData.get("memberId") as string;
  const kind = (formData.get("kind") as string) || "otro";
  const title = formData.get("title") as string;
  const dueDate = (formData.get("dueDate") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const memberId = memberIdStr ? parseInt(memberIdStr, 10) : 1;

  if (title?.trim()) {
    await addHealth(memberId, kind, title, dueDate, notes);
    revalidatePath("/");
  }
}

export async function completeHealthAction(id: number) {
  await completeHealth(id);
  revalidatePath("/");
}

export async function generateBriefingAction(kind: BriefingKind) {
  const content = await generateBriefing(kind);
  revalidatePath("/");
  return content;
}

export async function askAssistantAction(question: string) {
  return await askAssistant(question);
}

export async function updateMemberAction(formData: FormData) {
  const idStr = formData.get("id") as string;
  const name = formData.get("name") as string;
  const birthdate = formData.get("birthdate") as string;
  const emoji = formData.get("emoji") as string;
  const color = formData.get("color") as string;
  const telegramUserId = formData.get("telegramUserId") as string;
  const allergies = formData.get("allergies") as string;

  if (idStr) {
    await updateMember(parseInt(idStr, 10), {
      name: name?.trim() || undefined,
      birthdate: birthdate || null,
      emoji: emoji?.trim() || undefined,
      color: color?.trim() || undefined,
      telegram_user_id: telegramUserId?.trim() || null,
      allergies: allergies?.trim() || null,
    });
    revalidatePath("/");
  }
}

export async function updateSettingAction(key: string, value: string) {
  await setSetting(key, value);
  revalidatePath("/");
}

export async function generateSaturdayShoppingAction() {
  const result = await generateSaturdayShoppingList();
  revalidatePath("/");
  return result;
}

export async function syncMontessoriMenuAction() {
  const result = await syncMontessoriMenu();
  revalidatePath("/");
  return result;
}

export async function syncGoogleCalendarAction() {
  const result = await syncGoogleCalendars();
  revalidatePath("/");
  return result;
}

export async function getGcalUrlsAction() {
  const urlKike = await getSetting("gcal_url_kike");
  const urlLara = await getSetting("gcal_url_lara");
  return { urlKike: urlKike || "", urlLara: urlLara || "" };
}

export async function verifyGoogleCalendarAction(member: "kike" | "lara", testUrl?: string) {
  try {
    const key = member === "kike" ? "gcal_url_kike" : "gcal_url_lara";
    const url = testUrl?.trim() || (await getSetting(key));

    if (!url) {
      return { ok: false, message: `No hay URL de Google Calendar especificada para ${member === "kike" ? "Kike" : "Lara"}.` };
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      return { ok: false, message: `Error HTTP ${res.status}: no se pudo leer el feed. Revisa que sea la 'Dirección secreta en formato iCal'.` };
    }

    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      return { ok: false, message: "El enlace no contiene un calendario iCal válido (falta BEGIN:VCALENDAR)." };
    }

    const eventMatches = text.match(/BEGIN:VEVENT/gi);
    const count = eventMatches ? eventMatches.length : 0;

    // Sincronizar en base de datos si la URL ya está guardada o se pasó una válida
    if (testUrl) {
      await setSetting(key, testUrl.trim());
    }
    await syncGoogleCalendars();
    revalidatePath("/");

    return {
      ok: true,
      count,
      message: `Calendario verificado con éxito (${count} eventos cargados y sincronizados).`,
    };
  } catch (err: unknown) {
    return { ok: false, message: `Error al verificar iCal: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function verifyTelegramIntegrationAction(targetUserId?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, status: "no_token", message: "TELEGRAM_BOT_TOKEN no configurado en el servidor (.env.local)." };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, status: "invalid_token", message: "Token de Telegram no reconocido por la API de Telegram." };
    }
    const members = await getMembers();
    const kike = members.find((m) => m.name.toLowerCase() === "kike");
    const lara = members.find((m) => m.name.toLowerCase() === "lara");
    const userIdToCheck = targetUserId?.trim() || kike?.telegram_user_id;

    if (!userIdToCheck) {
      return {
        ok: true,
        status: "bot_only",
        botUsername: data.result.username,
        botName: data.result.first_name,
        message: `Bot @${data.result.username} (${data.result.first_name}) activo. Introduce tu Telegram User ID para vincularte.`,
      };
    }

    // Comprobar si el usuario ya inició conversación con el bot (/start)
    const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${userIdToCheck}`, { signal: AbortSignal.timeout(6000) });
    const chatData = await chatRes.json();

    if (chatData.ok) {
      return {
        ok: true,
        status: "active",
        botUsername: data.result.username,
        botName: data.result.first_name,
        userId: userIdToCheck,
        chatTitle: chatData.result.first_name || chatData.result.username || "Usuario",
        message: `✅ Bot @${data.result.username} activo y vinculado al ID ${userIdToCheck} (${chatData.result.first_name || "Kike"}). Listo para recibir órdenes y notificaciones.`,
      };
    } else {
      return {
        ok: true,
        status: "pending_start",
        botUsername: data.result.username,
        botName: data.result.first_name,
        userId: userIdToCheck,
        message: `Bot @${data.result.username} validado con ID ${userIdToCheck}. Falta abrir @${data.result.username} en Telegram y pulsar 'INICIAR' (/start) para activar los mensajes directos.`,
      };
    }
  } catch (err: unknown) {
    return { ok: false, status: "error", message: `Error al conectar con la API de Telegram: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function runAgentInstructionAction(instruction: string, history: any[] = []): Promise<AgentActionResult> {
  const result = await runAgentInstruction(instruction, history);
  if (result.actionExecuted) {
    revalidatePath("/");
  }
  return result;
}

export async function processReceiptAction(rawText: string): Promise<ParsedReceipt & { reconciliation: ReceiptReconciliationResult }> {
  const parsed = await parseReceiptText(rawText);
  const reconciliation = await saveProcessedReceipt(parsed, rawText);
  revalidatePath("/");
  return { ...parsed, reconciliation };
}

export async function processReceiptImageAction(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<ParsedReceipt & { reconciliation: ReceiptReconciliationResult }> {
  const parsed = await parseReceiptImage(base64Image, mimeType);
  const reconciliation = await saveProcessedReceipt(parsed, "[Ticket escaneado mediante Gemini Vision]");
  revalidatePath("/");
  return { ...parsed, reconciliation };
}

export async function scanTicketAction(data: {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<ParsedReceiptWithMatches> {
  let parsed: ParsedReceipt;

  if (data.imageBase64) {
    parsed = await parseReceiptImage(data.imageBase64, data.mimeType || "image/jpeg");
  } else if (data.text) {
    parsed = await parseReceiptText(data.text);
  } else {
    throw new Error("No se proporcionó ninguna imagen ni texto del ticket.");
  }

  const matchedShoppingItems = await findMatchingShoppingItems(parsed.items);

  return {
    ...parsed,
    matchedShoppingItems,
  };
}

export async function executeReceiptActionsAction(
  parsed: ParsedReceipt,
  config: ReceiptActionConfig,
  rawText?: string
): Promise<ReceiptExecutionResult> {
  const result = await executeReceiptActions(parsed, config, rawText);
  revalidatePath("/");
  return result;
}

export async function markPerishableConsumedAction(id: number) {
  await markItemConsumed(id);
  revalidatePath("/");
}

export async function seedDemoReceiptsAction() {
  await ensureDemoReceipts();
  revalidatePath("/");
}

// ── Gestión manual de Básicos (Staples) ───────────────────
export async function addStapleAction(name: string, emoji: string = "🛒", storeId?: number | null) {
  await createStaple(name, emoji, storeId);
  revalidatePath("/");
}

export async function deleteStapleAction(id: number) {
  await deleteStaple(id);
  revalidatePath("/");
}

export async function toggleStapleAction(name: string, emoji: string = "🛒", storeId?: number | null) {
  const added = await toggleStapleByName(name, emoji, storeId);
  revalidatePath("/");
  return added;
}

// ── Zona de Login y Perfiles (Kike y Lara) ─────────────────
export async function setActiveProfileCookieAction(memberId: number) {
  const cookieStore = await cookies();
  cookieStore.set("hd_active_member", memberId.toString(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
}

export async function clearActiveProfileCookieAction() {
  const cookieStore = await cookies();
  cookieStore.delete("hd_active_member");
  revalidatePath("/");
}

export async function updateProfilePreferenceAction(memberId: number, preferredTab: string) {
  await updateMemberPreference(memberId, preferredTab);
  revalidatePath("/");
}

export async function setProfilePinAction(memberId: number, pin: string) {
  await setMemberPin(memberId, pin);
  revalidatePath("/");
}

export async function verifyProfilePinAction(memberId: number, pin: string): Promise<boolean> {
  return await verifyMemberPin(memberId, pin);
}

// ── Optimización Energética y Memoria de Tarifas (Naturgy) ─
export async function updateEnergyContractAction(id: number, data: Partial<EnergyContract>) {
  await updateEnergyContract(id, data);
  revalidatePath("/");
}

export async function ingestEnergyBillTextAction(text: string) {
  const result = await parseEnergyBillText(text);
  revalidatePath("/");
  return result;
}

export async function ingestEnergyBillImageAction(base64Image: string, mimeType: string = "image/jpeg") {
  const result = await parseEnergyBillImage(base64Image, mimeType);
  revalidatePath("/");
  return result;
}

// ── Pólizas & Seguros Familiares ─────────────────────────────
export async function addFamilyInsuranceAction(formData: FormData) {
  const title = formData.get("title") as string;
  const category = (formData.get("category") as any) || "hogar";
  const provider = formData.get("provider") as string;
  const policyNumber = formData.get("policyNumber") as string;
  const annualCostStr = formData.get("annualCost") as string;
  const paymentFrequency = formData.get("paymentFrequency") as string;
  const renewalDate = formData.get("renewalDate") as string;
  const notes = formData.get("notes") as string;

  const { addFamilyInsurance } = await import("@/lib/repo");
  await addFamilyInsurance({
    title,
    category,
    provider,
    policy_number: policyNumber || null,
    annual_cost: parseFloat(annualCostStr) || 0,
    payment_frequency: paymentFrequency || "anual",
    renewal_date: renewalDate,
    active: true,
    notes: notes || null,
  });
  revalidatePath("/");
}

export async function deleteFamilyInsuranceAction(id: number) {
  const { deleteFamilyInsurance } = await import("@/lib/repo");
  await deleteFamilyInsurance(id);
  revalidatePath("/");
}

// ── Garantías & Documentos de Valor ──────────────────────────
export async function addWarrantyAction(formData: FormData) {
  const itemName = formData.get("itemName") as string;
  const storeName = formData.get("storeName") as string;
  const purchaseDate = formData.get("purchaseDate") as string;
  const warrantyYearsStr = formData.get("warrantyYears") as string;
  const priceStr = formData.get("price") as string;
  const notes = formData.get("notes") as string;

  const { addWarranty } = await import("@/lib/repo");
  await addWarranty({
    item_name: itemName,
    store_name: storeName || null,
    purchase_date: purchaseDate,
    warranty_years: parseInt(warrantyYearsStr, 10) || 3,
    price: priceStr ? parseFloat(priceStr) : null,
    status: "vigente",
    notes: notes || null,
  });
  revalidatePath("/");
}

export async function deleteWarrantyAction(id: number) {
  const { deleteWarranty } = await import("@/lib/repo");
  await deleteWarranty(id);
  revalidatePath("/");
}

