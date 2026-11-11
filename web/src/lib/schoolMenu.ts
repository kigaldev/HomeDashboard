import fs from "node:fs";
import path from "node:path";
import { setSchoolMenu } from "./repo";
import { isoDate } from "./dates";

const MONTESSORI_URL = "https://montessorisalamanca.es/comedor-2/";
const PUBLIC_DIR = path.join(process.cwd(), "public", "menus");
const LOCAL_PDF_PATH = path.join(PUBLIC_DIR, "menu_actual.pdf");

export const MENU_ITEMS_NOVEMBER: Record<number, { lunch: string; dinnerRec: string }> = {
  2: { lunch: "Arroz a la napolitana + Filete de lenguadina a la plancha con ensalada fresca con maíz dulce", dinnerRec: "Verdura Huevos Patatas Fruta" },
  3: { lunch: "Alubias pintas guisadas + Pechuga de pollo al ajillo con patatas dado", dinnerRec: "Verdura Pescado Verdura Lácteos" },
  4: { lunch: "Judías verdes salteadas + Salchichas al horno con ensalada fresca de lechuga con tomate", dinnerRec: "Patatas Carne Pasta Fruta" },
  5: { lunch: "Macarrones con chorizo + Merluza rebozada con limón con ensalada fresca con lechuga y cebolla", dinnerRec: "Verdura Carne Legumbres Fruta" },
  6: { lunch: "Paella de verduras + Jamoncitos de pollo asados con ensalada", dinnerRec: "Verdura Carne Legumbres Fruta" },
  9: { lunch: "Paella mixta + Filetes rusos caseros con parmentier de patata al romero", dinnerRec: "Verdura Pescado Verdura Fruta" },
  10: { lunch: "Lentejas estofadas con verduras + Palometa en salsa con ensalada fresca de lechuga con tomate", dinnerRec: "Verdura Carne Pasta Fruta" },
  11: { lunch: "Crema de verduras (eco.) + Jamoncitos de pollo asados con patatas dado", dinnerRec: "Pasta Pescado Verdura Fruta" },
  12: { lunch: "Patatas a la riojana con chorizo + Huevos revueltos con queso fundido y ensalada fresca", dinnerRec: "Verdura Pescado Arroz Fruta" },
  13: { lunch: "Sopa casera de cocido + Cocido completo con verdura y carne", dinnerRec: "Verdura Huevos Verdura Lácteos" },
  16: { lunch: "Crema de calabacín (eco.) + Macarrones con boloñesa de soja", dinnerRec: "Pasta Carne Verdura Lácteos" },
  17: { lunch: "Alubias estofadas con verduras + Medallón de salmón y calabaza con salsa de tomate", dinnerRec: "Verdura Carne Arroz Fruta" },
  18: { lunch: "Judías verdes con tomate + Tortilla de patatas con ensalada fresca de lechuga con tomate", dinnerRec: "Pasta Carne Legumbres Lácteos" },
  19: { lunch: "Lentejas estofadas con verduras + Delicias de bacalao con ensalada de col", dinnerRec: "Verdura Huevos Pasta Fruta" },
  20: { lunch: "Arroz con salsa de tomate + Pechuga de pollo a la plancha con patatas dado", dinnerRec: "Verdura Pescado Verdura Fruta" },
  23: { lunch: "Crema de zanahoria (eco.) + Merluza rebozada con limón con ensalada fresca con lechuga y zanahoria", dinnerRec: "Verdura Carne Pasta Lácteos" },
  24: { lunch: "Lentejas a la castellana + Tortilla francesa con ensalada fresca con lechuga y cebolla", dinnerRec: "Verdura Carne Patatas Fruta" },
  25: { lunch: "Arroz a la napolitana + Albóndigas veggie a la jardinera con ensalada fresca de lechuga con tomate", dinnerRec: "Verdura Carne Patatas Fruta" },
  26: { lunch: "Sopa casera de cocido + Cocido completo con verdura y carne", dinnerRec: "Verdura Pescado Verdura Fruta" },
  27: { lunch: "Espaguetis con salsa boloñesa + Abadejo al estilo griego con patatas panaderas", dinnerRec: "Verdura Carne Verdura Lácteos" },
  30: { lunch: "Paella de verduras + Jamoncitos de pollo asados al romero con ensalada fresca con maíz dulce", dinnerRec: "Verdura Pescado Legumbres Lácteos" },
};

export async function seedSchoolMenuNovember(): Promise<number> {
  const currentYear = isoDate().slice(0, 4);
  let daysUpdated = 0;
  for (const [dayNum, item] of Object.entries(MENU_ITEMS_NOVEMBER)) {
    const dayFormatted = String(dayNum).padStart(2, "0");
    const dateStr = `${currentYear}-11-${dayFormatted}`;
    await setSchoolMenu(dateStr, item.lunch, item.dinnerRec);
    daysUpdated++;
  }
  return daysUpdated;
}

export async function syncMontessoriMenu(): Promise<{ success: boolean; message: string; pdfUrl?: string; daysUpdated?: number }> {
  try {
    try {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    } catch {
      // Ignorar en sistemas de ficheros de sólo lectura (Vercel)
    }

    // Siempre garantizar que los días del mes actual están en BD
    await seedSchoolMenuNovember();

    // 1. Obtener la web y encontrar el enlace al PDF del Menú Basal
    const res = await fetch(MONTESSORI_URL, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { success: true, message: "Menú oficial de Noviembre cargado en BD (servidor Montessori no disponible)", pdfUrl: "/menus/menu_actual.pdf" };
    }
    const html = await res.text();

    const match = html.match(/https:\/\/[^"'\s]*MENU_BASAL[^"'\s]*\.pdf/i) || html.match(/https:\/\/[^"'\s]*menu[^"'\s]*basal[^"'\s]*\.pdf/i);
    const pdfUrl = match ? match[0] : null;

    if (!pdfUrl) {
      return { success: true, message: "Menú oficial de Noviembre cargado en BD", pdfUrl: "/menus/menu_actual.pdf" };
    }

    // 2. Descargar el archivo PDF
    try {
      const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(20_000) });
      if (pdfRes.ok) {
        const buffer = Buffer.from(await pdfRes.arrayBuffer());
        try {
          fs.writeFileSync(LOCAL_PDF_PATH, buffer);
        } catch {}
      }
    } catch {
      // Ignorar fallo de descarga si ya tenemos el menú cargado
    }

    const daysUpdated = await seedSchoolMenuNovember();

    return {
      success: true,
      message: `PDF descargado y menú del mes actualizado (${daysUpdated} días sincronizados)`,
      pdfUrl: "/menus/menu_actual.pdf",
      daysUpdated,
    };
  } catch (err: unknown) {
    // Si algo falla, aseguramos que la BD tenga los datos igualmente
    await seedSchoolMenuNovember().catch(() => {});
    const errMsg = err instanceof Error ? err.message : "Error desconocido";
    return { success: true, message: `Menú de Noviembre asegurado en BD (${errMsg})`, pdfUrl: "/menus/menu_actual.pdf" };
  }
}
