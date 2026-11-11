import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
export const id = z.number().int().positive();
export const optId = z.preprocess(emptyToUndef, z.coerce.number().int().nonnegative().optional()).transform((v) => v ?? null);
const optStr = (max: number) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional()).transform((v) => v ?? null);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN inválido");
export const optionalPinSchema = z.string().regex(/^(\d{4})?$/, "PIN inválido");

export const shoppingForm = z.object({
  name: z.string().trim().min(1).max(120),
  storeId: optId,
  quantity: optStr(40),
  by: optId,
});
export const taskForm = z.object({
  title: z.string().trim().min(1).max(200),
  assigneeId: optId,
  dueDate: z.preprocess(emptyToUndef, isoDate.optional()).transform((v) => v ?? null),
  recurrence: z.preprocess(emptyToUndef, z.enum(["daily", "weekly", "monthly"]).optional()).transform((v) => v ?? null),
});
export const shortText = z.string().trim().max(500);
export const longText = z.string().max(20_000);
export const imageB64 = z.string().max(15_000_000);
export const mime = z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
export const assignments = z.array(z.object({ id, storeId: id })).max(500);

/** Parsea con Zod y lanza un error legible (las Server Actions propagan el mensaje). */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error("Datos inválidos: " + r.error.issues.map((i) => `${i.path.join(".") || "valor"}: ${i.message}`).join("; "));
  return r.data;
}
export function formObject(fd: FormData): Record<string, unknown> {
  return Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
}
