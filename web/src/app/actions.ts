"use server";

import { revalidatePath } from "next/cache";
import {
  getActiveMemberId, setActiveMemberCookie, clearActiveMemberCookie, grantPinProof, hasPinProof,
} from "@/lib/session";
import {
  parse, formObject, id as idSchema, shoppingForm, taskForm, shortText, longText, imageB64, mime,
  assignments, pinSchema, optionalPinSchema,
} from "@/lib/validation";
import { z } from "zod";
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
import { markItemConsumed, ensureDemoReceipts, updateEnergyContract, upsertEnergyContract, type EnergyContract, syncFrequentStaples } from "@/lib/repo";
import { parseEnergyBillText, parseEnergyBillImage } from "@/lib/energy";

export async function addShoppingAction(formData: FormData) {
  const v = parse(shoppingForm, formObject(formData));
  const by = v.by ?? (await getActiveMemberId());
  await addShopping(v.name, { storeId: v.storeId, quantity: v.quantity, by });
  revalidatePath("/");
}

export async function quickAddStapleAction(name: string, storeId: number | null) {
  const v = parse(z.object({ name: z.string().trim().min(1).max(120), storeId: idSchema.nullable() }), { name, storeId });
  const by = await getActiveMemberId();
  await addShopping(v.name, { storeId: v.storeId, by });
  revalidatePath("/");
}

export async function syncFrequentStaplesAction(): Promise<string[]> {
  const promoted = await syncFrequentStaples();
  if (promoted.length > 0) {
    revalidatePath("/");
  }
  return promoted;
}

export async function toggleShoppingAction(id: number) {
  id = parse(idSchema, id);
  await toggleShopping(id);
  revalidatePath("/");
}

export async function toggleInCartAction(id: number) {
  id = parse(idSchema, id);
  await toggleInCart(id);
  revalidatePath("/");
}

export async function setShoppingItemStoreAction(id: number, storeId: number | null) {
  ({ id, storeId } = parse(z.object({ id: idSchema, storeId: idSchema.nullable() }), { id, storeId }));
  await setShoppingItemStore(id, storeId);
  revalidatePath("/");
}

export async function optimizeShoppingBasketAction(): Promise<BasketOptimizationResult> {
  const items = await getShopping();
  const stores = await getStores();
  return await optimizeShoppingBasket(items, stores);
}

export async function applyBasketOptimizationAction(items: { id: number; storeId: number }[]) {
  await batchUpdateShoppingStores(parse(assignments, items));
  revalidatePath("/");
}

export async function deleteShoppingAction(id: number) {
  id = parse(idSchema, id);
  await deleteShopping(id);
  revalidatePath("/");
}

export async function clearCheckedShoppingAction() {
  await clearChecked();
  revalidatePath("/");
}

export async function setPantryStatusAction(name: string, status: PantryItem["status"]) {
  name = parse(z.string().trim().min(1).max(120), name);
  await setPantry(name, status);
  revalidatePath("/");
}

export async function addTaskAction(formData: FormData) {
  const v = parse(taskForm, formObject(formData));
  await addTask(v.title, v.assigneeId, v.dueDate, v.recurrence);
  revalidatePath("/");
}

export async function toggleTaskAction(id: number) {
  id = parse(idSchema, id);
  await toggleTask(id);
  revalidatePath("/");
}

export async function deleteTaskAction(id: number) {
  id = parse(idSchema, id);
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
  question = parse(z.string().trim().min(1).max(2000), question);
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
  instruction = parse(z.string().trim().min(1).max(4000), instruction);
  history = parse(z.array(z.any()).max(50), history);
  const result = await runAgentInstruction(instruction, history);
  if (result.actionExecuted) {
    revalidatePath("/");
  }
  return result;
}

export async function processReceiptAction(rawText: string): Promise<ParsedReceipt & { reconciliation: ReceiptReconciliationResult }> {
  rawText = parse(longText.min(1), rawText);
  const parsed = await parseReceiptText(rawText);
  const reconciliation = await saveProcessedReceipt(parsed, rawText);
  revalidatePath("/");
  return { ...parsed, reconciliation };
}

export async function processReceiptImageAction(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<ParsedReceipt & { reconciliation: ReceiptReconciliationResult }> {
  base64Image = parse(imageB64.min(1), base64Image);
  mimeType = parse(mime, mimeType);
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
  data = parse(z.object({ text: longText.optional(), imageBase64: imageB64.optional(), mimeType: mime.optional() }), data);
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
  rawText = parse(longText.optional(), rawText);
  const result = await executeReceiptActions(parsed, config, rawText);
  revalidatePath("/");
  return result;
}

export async function markPerishableConsumedAction(id: number) {
  id = parse(idSchema, id);
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
  memberId = parse(idSchema, memberId);
  const member = (await getMembers()).find((m) => m.id === memberId);
  if (!member) throw new Error("Perfil no encontrado.");
  // Si tiene PIN, hace falta una verificación reciente (cookie firmada de 2 min)
  if (member.pin && !(await hasPinProof(memberId))) throw new Error("PIN requerido.");
  await setActiveMemberCookie(memberId);
  revalidatePath("/");
}

export async function clearActiveProfileCookieAction() {
  await clearActiveMemberCookie();
  revalidatePath("/");
}

export async function updateProfilePreferenceAction(memberId: number, preferredTab: string) {
  ({ memberId, preferredTab } = parse(z.object({ memberId: idSchema, preferredTab: z.string().trim().min(1).max(40) }), { memberId, preferredTab }));
  await updateMemberPreference(memberId, preferredTab);
  revalidatePath("/");
}

export async function setProfilePinAction(memberId: number, pin: string) {
  memberId = parse(idSchema, memberId);
  pin = parse(optionalPinSchema, pin);
  const member = (await getMembers()).find((m) => m.id === memberId);
  if (!member) throw new Error("Perfil no encontrado.");
  // Cambiar un PIN existente exige ser ese miembro (sesión firmada) o PIN recién verificado
  if (member.pin && (await getActiveMemberId()) !== memberId && !(await hasPinProof(memberId))) {
    throw new Error("No autorizado.");
  }
  await setMemberPin(memberId, pin);
  revalidatePath("/");
}

export async function verifyProfilePinAction(memberId: number, pin: string): Promise<boolean> {
  const v = z.object({ memberId: idSchema, pin: pinSchema }).safeParse({ memberId, pin });
  if (!v.success) return false;
  const ok = await verifyMemberPin(v.data.memberId, v.data.pin);
  if (ok) await grantPinProof(v.data.memberId);
  return ok;
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

// ── Recetas & Cenas (Inspirado en Mealie / schema.org) ──────────
export async function scrapeRecipeUrlAction(url: string) {
  const { scrapeRecipeUrl } = await import("@/lib/recipeScraper");
  return await scrapeRecipeUrl(url);
}

export async function addRecipeIngredientsToShoppingAction(ingredients: string[]) {
  const { addShopping } = await import("@/lib/repo");
  for (const ing of ingredients) {
    if (ing && ing.trim()) {
      await addShopping(ing.trim());
    }
  }
  revalidatePath("/");
}


