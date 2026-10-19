"use server";

import { revalidatePath } from "next/cache";
import {
  addShopping,
  toggleShopping,
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
  setSetting,
  type PantryItem,
  type Task,
} from "@/lib/repo";
import { ensureDinnerPlans } from "@/lib/dinners";
import { generateBriefing, type BriefingKind } from "@/lib/briefing";
import { askAssistant, runAgentInstruction, type AgentActionResult } from "@/lib/assistant";
import { generateSaturdayShoppingList } from "@/lib/weeklyShopping";
import { syncMontessoriMenu } from "@/lib/schoolMenu";
import { syncGoogleCalendars } from "@/lib/gcal";
import { parseReceiptText, saveProcessedReceipt, type ParsedReceipt } from "@/lib/receipts";
import { markItemConsumed, ensureDemoReceipts } from "@/lib/repo";

export async function addShoppingAction(formData: FormData) {
  const name = formData.get("name") as string;
  const storeIdStr = formData.get("storeId") as string;
  const quantity = formData.get("quantity") as string;
  const storeId = storeIdStr ? parseInt(storeIdStr, 10) : null;
  if (name?.trim()) {
    await addShopping(name, { storeId, quantity: quantity?.trim() || null });
    revalidatePath("/");
  }
}

export async function quickAddStapleAction(name: string, storeId: number | null) {
  await addShopping(name, { storeId });
  revalidatePath("/");
}

export async function toggleShoppingAction(id: number) {
  await toggleShopping(id);
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

export async function runAgentInstructionAction(instruction: string, history: any[] = []): Promise<AgentActionResult> {
  const result = await runAgentInstruction(instruction, history);
  if (result.actionExecuted) {
    revalidatePath("/");
  }
  return result;
}

export async function processReceiptAction(rawText: string): Promise<ParsedReceipt> {
  const parsed = await parseReceiptText(rawText);
  await saveProcessedReceipt(parsed, rawText);
  revalidatePath("/");
  return parsed;
}

export async function markPerishableConsumedAction(id: number) {
  await markItemConsumed(id);
  revalidatePath("/");
}

export async function seedDemoReceiptsAction() {
  await ensureDemoReceipts();
  revalidatePath("/");
}

