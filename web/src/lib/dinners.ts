import "server-only";
import { llm, parseJson } from "./llm";
import { getDinnerPlans, getPantry, getRecentDinners, getSchoolMenu, saveDinnerPlans, getMembers } from "./repo";

type Cat = "pescado" | "carne" | "huevo" | "legumbre" | "verdura";
type Recipe = { title: string; description: string; cat: Cat };

/**
 * Recetario base para CENAS:
 * CRITERIO NUTRICIONAL DE LA FAMILIA:
 * - Carbohidratos mínimos por la noche.
 * - CERO pasta blanca, arroz blanco, masas refinadas o fideos.
 * - Si hay carbohidratos, son exclusivamente HIDRATOS DE CARBONO COMPLEJOS (boniato, calabaza, legumbres suaves, quinoa, patata al vapor) y en cantidad moderada.
 * - Protagonismo de proteínas de calidad (pescado, huevos, pollo/pavo, ternera) y verduras/hortalizas.
 * - Texturas y preparaciones aptas y atractivas para Fabio (3 años) y Bruno (1 año).
 */
const MAMBO: Recipe[] = [
  {
    title: "Crema de calabacín y quesitos con tortilla francesa",
    description: "Mambo: sofrito 5 min/120°C/vel 1, añadir calabacín y agua 20 min/100°C/vel 1, quesitos y triturar 1 min/vel 10. Acompañar con tortilla francesa jugosa.",
    cat: "verdura",
  },
  {
    title: "Merluza al vapor con judías verdes y zanahoria",
    description: "Mambo: agua en la jarra, judías y zanahorias en el cestillo y merluza en la bandeja de vapor Varoma 22 min/vel 2. Rociar con AOVE en crudo.",
    cat: "pescado",
  },
  {
    title: "Albóndigas de pollo y pavo en salsa de tomate natural y verduras",
    description: "Mambo: salsa de tomate triturado natural, calabacín y cebolla 20 min/100°C/vel 1 y las albóndigas cocinadas al vapor encima 25 min/Varoma.",
    cat: "carne",
  },
  {
    title: "Crema suave de calabaza asada y lentejas rojas",
    description: "Mambo: calabaza, zanahoria y lentejas rojas peladas 20 min/100°C/vel 1 y triturar fino. Hidratos complejos de digestión lenta y muy nutritivos.",
    cat: "legumbre",
  },
  {
    title: "Puré ligero de puerro y calabacín con salmón al vapor",
    description: "Mambo: puerro y calabacín con un toque de patata cocida 20 min/100°C/vel 1 y salmón al vapor en la bandeja Varoma a la vez.",
    cat: "pescado",
  },
  {
    title: "Pollo en dados con verduras y daditos de boniato",
    description: "Mambo con giro inverso: pechuga en dados con verduras variadas y dados de boniato en el cestillo 20 min/100°C/vel cuchara.",
    cat: "carne",
  },
  {
    title: "Flan de huevo y espinacas al vapor",
    description: "Mambo: batir huevos con espinacas y leche, cuajar en flaneras en la vaporera 25 min/Varoma. Textura suave ideal para los peques.",
    cat: "huevo",
  },
  {
    title: "Pisto suave de verduras con huevo poché",
    description: "Mambo: calabacín, berenjena y tomate casero 25 min/120°C/vel 1, con huevos pochados al vapor en la bandeja superior.",
    cat: "verdura",
  },
  {
    title: "Hummus de garbanzos con palitos de zanahoria y pepino",
    description: "Mambo: garbanzos cocidos, tahini, limón y AOVE 1 min/vel 8. Cena saciante de picoteo con verduras crudas o al vapor.",
    cat: "legumbre",
  },
  {
    title: "Sopa de caldo casero con picadillo de verduras y pavo",
    description: "Mambo: caldo casero de ave con verduras picadas finas y dados de pavo 20 min/100°C/giro inverso. Reconfortante y sin carbohidratos refinados.",
    cat: "carne",
  },
];

const STANDARD: Recipe[] = [
  {
    title: "Tortilla de calabacín y cebolla con ensalada de tomate",
    description: "Sartén: calabacín pochado a fuego lento con cebolla y huevos camperos. Muy baja en hidratos, saciante y suave para los niños.",
    cat: "huevo",
  },
  {
    title: "Lenguado o gallo a la plancha con puré de coliflor y zanahoria",
    description: "Plancha: filetes de pescado blanco sin espinas con puré bajo en hidratos de coliflor y zanahoria con AOVE.",
    cat: "pescado",
  },
  {
    title: "Pechuga de pollo a la plancha con champiñones salteados",
    description: "Sartén: filetes finos de pechuga a la plancha con champiñones al ajillo suave y rodajas de tomate aliñadas.",
    cat: "carne",
  },
  {
    title: "Revuelto cremoso de calabacín, pavo y queso tierno",
    description: "Sartén: calabacín rallado pochado con dados de pechuga de pavo y huevos camperos revueltos a fuego muy bajo.",
    cat: "huevo",
  },
  {
    title: "Salmón al horno con bastones de boniato y calabacín",
    description: "Horno a 180°C: lomos de salmón acompañados de bastones de boniato (hidrato complejo de bajo índice glucémico) y calabacín 18 min.",
    cat: "pescado",
  },
  {
    title: "Hamburguesitas caseras de ternera con verduras al horno",
    description: "Horno: hamburguesitas caseras de ternera magra acompañadas de bastones de zanahoria y brócoli asado con aceite de oliva.",
    cat: "carne",
  },
  {
    title: "Merluza en papillote con verduras en juliana",
    description: "Horno o sartén tapada: merluza envuelta en papel con tiras de calabacín, puerro y zanahoria. Se cocina en su propio jugo sin grasas.",
    cat: "pescado",
  },
  {
    title: "Crema de brócoli y calabacín con huevo duro picado",
    description: "Olla: crema ligera de verduras verdes, servida con huevo duro picado y semillas de calabaza o sésamo.",
    cat: "verdura",
  },
  {
    title: "Wok rápido de tiras de pollo y verduras salteadas",
    description: "Sartén/Wok: tiras finas de pechuga salteadas a fuego vivo con pimiento, calabacín y cebolleta.",
    cat: "carne",
  },
  {
    title: "Revuelto de judías verdes finas con taquitos de jamón",
    description: "Sartén: judías verdes al vapor salteadas con un hilo de AOVE, taquitos de jamón serrano y huevo cuajado jugoso.",
    cat: "huevo",
  },
];

const KEYWORDS: Record<Cat, string[]> = {
  pescado: ["merluza", "pescado", "salmón", "salmon", "atún", "atun", "bacalao", "gallo", "lenguado", "rape", "abadejo", "sardina"],
  carne: ["pollo", "ternera", "cerdo", "carne", "albóndiga", "albondiga", "filete", "pavo", "lomo", "hamburguesa"],
  huevo: ["huevo", "tortilla", "revuelto", "flan"],
  legumbre: ["lenteja", "garbanzo", "alubia", "judía", "legumbre", "hummus"],
  verdura: ["crema", "puré", "pure", "verdura", "menestra", "ensalada", "acelga", "brócoli", "brocoli", "coliflor", "calabacín", "calabacin", "calabaza", "boniato"],
};

function catsIn(text: string | null): Set<Cat> {
  const s = new Set<Cat>();
  if (!text) return s;
  const t = text.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS) as [Cat, string[]][]) if (words.some((w) => t.includes(w))) s.add(cat);
  return s;
}

function pick(list: Recipe[], avoid: Set<Cat>, recent: Set<string>, seed: number): Recipe {
  const ok = list.filter((r) => !avoid.has(r.cat) && !recent.has(r.title));
  const pool = ok.length ? ok : list;
  return pool[seed % pool.length];
}

function seedOf(date: string) {
  return Number(date.replaceAll("-", "")) % 997;
}

/** Detecta si un plan de cena contiene carbohidratos simples no deseados por la noche */
function hasDisallowedCarbs(title: string, description: string = ""): boolean {
  const text = (title + " " + description).toLowerCase();
  const banned = ["pasta", "macarrón", "macarron", "espagueti", "espaghetti", "fideo", "pizza", "lasaña", "lasagna", "arroz"];
  return banned.some((w) => text.includes(w));
}

export async function ensureDinnerPlans(date: string, force = false) {
  const existing = await getDinnerPlans(date);
  const containsBanned = existing.some((p) => hasDisallowedCarbs(p.title, p.description || ""));

  if (existing.length && !force && !containsBanned) return existing;

  const [menu, recentRows, pantry, members] = await Promise.all([
    getSchoolMenu(date), getRecentDinners(), getPantry(), getMembers(),
  ]);
  const lunch = menu?.lunch ?? null;
  const dinnerRec = menu?.dinner_recommendation ?? null;
  const recent = new Set(recentRows.map((r) => r.title));
  const avoid = catsIn(lunch);
  const allergies = members.map((m) => m.allergies).filter(Boolean).join(", ");

  // 1) Intento con IA local: tiene en cuenta despensa, menú del cole, recomendación (*) y regla baja en hidratos
  const ai = parseJson<{ mambo: { title: string; description: string }; estandar: { title: string; description: string } }>(
    await llm(
      [
        {
          role: "system",
          content:
            "Eres el planificador nutricional de cenas de una familia con 2 niños pequeños (Fabio de 3 años y Bruno de 1 año). Respondes SOLO con JSON válido en español.\n" +
            "REGLAS NUTRICIONALES ESTRICTAS PARA LAS CENAS:\n" +
            "1. Cero carbohidratos simples: NUNCA sugieras pasta blanca, macarrones, espaguetis, arroz blanco, fideos o pizza.\n" +
            "2. Mínimos hidratos de carbono por la noche. Si se incluye algún hidrato, debe ser COMPLEJO y en porción moderada (boniato, calabaza, lentejas rojas, garbanzos, o pequeña guarnición de patata al vapor).\n" +
            "3. Protagonismo de proteínas de alta calidad (pescado blanco/azul, huevos, pollo, pavo, ternera) y verduras/hortalizas abundantes.\n" +
            "4. Comidas aptas para niños de 0 a 5 años (fáciles de masticar, sin espinas, suaves).\n" +
            "5. Dos opciones: una para robot Cecotec Mambo (con tiempo/temperatura/velocidad) y otra estándar (sartén/horno/plancha). Máx 30 min.",
        },
        {
          role: "user",
          content:
            `Comida del cole hoy: ${lunch ?? "desconocida"}.\n` +
            (dinnerRec ? `Recomendación oficial del cole (*): ${dinnerRec} (prioriza esta combinación).\n` : "") +
            `Evita repetir la misma proteína del mediodía.\n` +
            `Cenas recientes (no repetir): ${[...recent].join("; ") || "ninguna"}.\n` +
            `En la despensa queda poco de: ${pantry.filter((p) => p.status !== "ok").map((p) => p.name).join(", ") || "nada"}.\n` +
            `Alergias: ${allergies || "ninguna"}.\n` +
            'Formato exacto: {"mambo":{"title":"…","description":"…"},"estandar":{"title":"…","description":"…"}}',
        },
      ],
      { timeoutMs: 60_000, json: true },
    ),
  );

  const seed = seedOf(date);
  let mambo = ai?.mambo?.title && !hasDisallowedCarbs(ai.mambo.title, ai.mambo.description)
    ? ai.mambo
    : pick(MAMBO, avoid, recent, seed);

  let estandar = ai?.estandar?.title && !hasDisallowedCarbs(ai.estandar.title, ai.estandar.description)
    ? ai.estandar
    : pick(STANDARD, avoid, recent, seed + 3);

  // Asegurar que ninguna de las opciones seleccionadas tenga carbohidratos simples
  if (hasDisallowedCarbs(mambo.title, mambo.description)) {
    mambo = MAMBO[0];
  }
  if (hasDisallowedCarbs(estandar.title, estandar.description)) {
    estandar = STANDARD[0];
  }

  await saveDinnerPlans(date, [
    { option: "mambo", title: mambo.title, description: mambo.description },
    { option: "estandar", title: estandar.title, description: estandar.description },
  ]);
  return getDinnerPlans(date);
}
