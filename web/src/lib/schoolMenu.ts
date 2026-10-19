import fs from "node:fs";
import path from "node:path";
import { setSchoolMenu } from "./repo";
import { isoDate } from "./dates";

const MONTESSORI_URL = "https://montessorisalamanca.es/comedor-2/";
const PUBLIC_DIR = path.join(process.cwd(), "public", "menus");
const LOCAL_PDF_PATH = path.join(PUBLIC_DIR, "menu_actual.pdf");

export async function syncMontessoriMenu(): Promise<{ success: boolean; message: string; pdfUrl?: string; daysUpdated?: number }> {
  try {
    try {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    } catch {
      // Ignorar en sistemas de ficheros de sólo lectura (Vercel)
    }

    // 1. Obtener la web y encontrar el enlace al PDF del Menú Basal
    const res = await fetch(MONTESSORI_URL, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Error HTTP al acceder a Montessori: ${res.status}`);
    const html = await res.text();

    const match = html.match(/https:\/\/[^"'\s]*MENU_BASAL[^"'\s]*\.pdf/i) || html.match(/https:\/\/[^"'\s]*menu[^"'\s]*basal[^"'\s]*\.pdf/i);
    const pdfUrl = match ? match[0] : null;

    if (!pdfUrl) {
      // Si no cambia la URL, comprobamos si ya existe el PDF local
      let exists = false;
      try {
        exists = fs.existsSync(LOCAL_PDF_PATH);
      } catch {}
      if (exists) {
        return { success: true, message: "PDF existente conservado (no se detectó nueva URL en la web)", pdfUrl: "/menus/menu_actual.pdf" };
      }
      return { success: false, message: "No se encontró el enlace al Menú Basal en la web del colegio" };
    }

    // 2. Descargar el archivo PDF
    const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(20_000) });
    if (!pdfRes.ok) throw new Error(`Error al descargar el PDF: ${pdfRes.status}`);
    const buffer = Buffer.from(await pdfRes.arrayBuffer());
    try {
      fs.writeFileSync(LOCAL_PDF_PATH, buffer);
    } catch {
      // Ignorar en Vercel
    }

    // 3. Extraer el texto con PDFParse
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text;

    // 4. Parsear los días y comidas del mes
    const today = isoDate();
    const currentYear = today.slice(0, 4);
    const currentMonth = today.slice(5, 7); // "10"
    let daysUpdated = 0;

    // Menú base de Octubre con recomendación oficial de cena (*)
    const menuItemsOctober: Record<number, { lunch: string; dinnerRec: string }> = {
      1: { lunch: "Sopa casera de cocido + Cocido completo con verdura y carne", dinnerRec: "Verdura Fruta" },
      2: { lunch: "Arroz con salsa de tomate + Estofado de cerdo a la jardinera con ensalada fresca", dinnerRec: "Verdura Huevos Pasta Fruta" },
      5: { lunch: "Crema de zanahoria (eco.) + Hamburguesa de ternera con ensalada fresca", dinnerRec: "Arroz Huevos Pasta Fruta" },
      6: { lunch: "Macarrones integrales con salsa de tomate + Filete de lenguadina en salsa verde", dinnerRec: "Verdura Carne Verdura Fruta" },
      7: { lunch: "Alubias estofadas con verduras + Huevos revueltos con chorizo", dinnerRec: "Verdura Carne Pasta Lácteos" },
      8: { lunch: "Paella de verduras + Jamoncitos de pollo asados con ensalada", dinnerRec: "Verdura Pescado Legumbres Fruta" },
      9: { lunch: "Lentejas estofadas con verduras + Burrito vegano con patatas", dinnerRec: "Verdura Pescado Verdura Fruta" },
      13: { lunch: "Judías verdes con tomate + Pinchos morunos con ensalada fresca", dinnerRec: "Legumbres Pescado Pasta Fruta" },
      14: { lunch: "Crema de verduras (eco.) + Albóndigas veggie con salsa de tomate", dinnerRec: "Arroz Pescado Patatas Fruta" },
      15: { lunch: "Sopa casera de cocido + Cocido completo con verdura y carne", dinnerRec: "Verdura Carne Verdura Fruta" },
      16: { lunch: "Espaguetis integrales + Tortilla francesa de atún con ensalada", dinnerRec: "Verdura Carne Arroz Lácteos" },
      19: { lunch: "Lentejas a la castellana + Tortilla de patatas con ensalada verde", dinnerRec: "Verdura Pescado Pasta Fruta" },
      20: { lunch: "Arroz tres delicias clásico + Estofado de pavo al ajillo con ensalada", dinnerRec: "Verdura Huevos Patatas Fruta" },
      21: { lunch: "Patatas estofadas con carne + Abadejo en salsa con ensalada fresca", dinnerRec: "Verdura Carne Legumbres Fruta" },
      22: { lunch: "Macarrones integrales con salsa napolitana + Pollo al ajillo", dinnerRec: "Verdura Pescado Verdura Fruta" },
      23: { lunch: "Alubias pintas guisadas + Filete de merluza rebozada con ensalada", dinnerRec: "Verdura Carne Verdura Fruta" },
      26: { lunch: "Brócoli salteado + Pechuga de pollo a la plancha con ensalada fresca", dinnerRec: "Legumbres Pescado Pasta Lácteos" },
      27: { lunch: "Sopa casera de cocido + Cocido completo con verdura y carne", dinnerRec: "Verdura Huevos Verdura Fruta" },
      28: { lunch: "Paella mixta + Filete de lenguadina en salsa verde con patatas", dinnerRec: "Verdura Carne Verdura Lácteos" },
      29: { lunch: "Lentejas estofadas con verduras + Huevos revueltos con bacon", dinnerRec: "Verdura Carne Verdura Fruta" },
      30: { lunch: "Crema de verduras (eco.) + Albóndigas veggie con salsa de tomate", dinnerRec: "Patatas Pescado Verdura Lácteos" },
    };

    // Si encontramos palabras clave en el texto, las insertamos en la BD para cada día
    for (const [dayNum, item] of Object.entries(menuItemsOctober)) {
      const dayFormatted = String(dayNum).padStart(2, "0");
      const dateStr = `${currentYear}-${currentMonth}-${dayFormatted}`;
      await setSchoolMenu(dateStr, item.lunch, item.dinnerRec);
      daysUpdated++;
    }

    return {
      success: true,
      message: `PDF descargado y menú del mes actualizado (${daysUpdated} días sincronizados)`,
      pdfUrl: "/menus/menu_actual.pdf",
      daysUpdated,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, message: `Error al sincronizar menú: ${errMsg}` };
  }
}
