import { addShopping, getPantry, getStores, getShopping } from "./repo";

export type WeeklyPlanItem = {
  day: string;
  mambo: string;
  estandar: string;
  ingredients: { name: string; storeName: "Mercadona" | "Carrefour" | "Lidl" | "Farmacia" }[];
};

/**
 * Plan semanal equilibrado para Batch Cooking de domingo y cenas de lunes a viernes:
 * - Cero carbohidratos simples por la noche (sin pasta, sin arroz blanco, sin harinas refinadas).
 * - Hidratos de carbono complejos en ración moderada (boniato, calabaza, legumbres suaves, verduras).
 * - Rico en proteínas de alto valor biológico (pescado fresco, huevos, pollo/pavo, ternera) y hortalizas.
 */
export const DEFAULT_WEEK_DINNERS: WeeklyPlanItem[] = [
  {
    day: "Lunes",
    mambo: "Crema de calabacín y quesitos con tortilla francesa (Mambo)",
    estandar: "Tortilla de calabacín con ensalada de canónigos y tomate",
    ingredients: [
      { name: "Calabacines (1 kg)", storeName: "Lidl" },
      { name: "Quesitos en porciones (1 caja)", storeName: "Mercadona" },
      { name: "Huevos camperos (1 docena)", storeName: "Mercadona" },
    ],
  },
  {
    day: "Martes",
    mambo: "Albóndigas de pollo y verduras en salsa de tomate natural (Mambo)",
    estandar: "Pechuga de pollo a la plancha con salteado de champiñones",
    ingredients: [
      { name: "Carne picada de pollo y pavo (500g)", storeName: "Mercadona" },
      { name: "Zanahorias y cebollas", storeName: "Carrefour" },
      { name: "Tomate triturado natural sin azúcares", storeName: "Mercadona" },
    ],
  },
  {
    day: "Miércoles",
    mambo: "Puré ligero de puerro y calabacín con salmón al vapor (Mambo)",
    estandar: "Salmón al horno con bastones de boniato y calabacín",
    ingredients: [
      { name: "Lomos de salmón fresco", storeName: "Carrefour" },
      { name: "Puerros y calabacines", storeName: "Lidl" },
      { name: "Boniato / batata (1 kg)", storeName: "Carrefour" },
    ],
  },
  {
    day: "Jueves",
    mambo: "Crema suave de calabaza asada y lentejas rojas (Mambo)",
    estandar: "Hamburguesitas caseras de ternera con brócoli al horno",
    ingredients: [
      { name: "Lentejas rojas peladas", storeName: "Mercadona" },
      { name: "Calabaza en dados", storeName: "Carrefour" },
      { name: "Hamburguesas de ternera magra", storeName: "Mercadona" },
    ],
  },
  {
    day: "Viernes",
    mambo: "Merluza al vapor con judías verdes finas y zanahoria (Mambo)",
    estandar: "Merluza en papillote con verduritas en juliana",
    ingredients: [
      { name: "Lomos de merluza fresca", storeName: "Carrefour" },
      { name: "Judías verdes planas / finas", storeName: "Carrefour" },
      { name: "Zanahorias bolsa 1kg", storeName: "Lidl" },
    ],
  },
];

/**
 * Genera la lista completa de compra para el sábado:
 * 1. Ingredientes del Batch cooking para toda la semana siguiente (bajos en carbohidratos).
 * 2. Reposición de despensa (todo lo que esté en 'low' o 'out').
 * 3. Básicos recurrentes para Fabio y Bruno (leche, pañales, fruta, yogures).
 */
export async function generateSaturdayShoppingList(): Promise<{ addedCount: number; itemsAdded: string[] }> {
  const [pantry, stores, existingShopping] = await Promise.all([
    getPantry(),
    getStores(),
    getShopping(),
  ]);

  const existingNames = new Set(existingShopping.filter((i) => !i.checked).map((i) => i.name.toLowerCase()));
  const storeMap = new Map(stores.map((s) => [s.name.toLowerCase(), s.id]));
  const itemsToAdd: { name: string; storeId: number | null }[] = [];

  // 1. Ingredientes de las cenas saludables de la semana
  for (const day of DEFAULT_WEEK_DINNERS) {
    for (const ing of day.ingredients) {
      if (!existingNames.has(ing.name.toLowerCase())) {
        const storeId = storeMap.get(ing.storeName.toLowerCase()) ?? null;
        itemsToAdd.push({ name: ing.name, storeId });
        existingNames.add(ing.name.toLowerCase());
      }
    }
  }

  // 2. Reponer despensa gastada
  for (const p of pantry) {
    if (p.status !== "ok" && !existingNames.has(p.name.toLowerCase())) {
      const storeId = storeMap.get("mercadona") ?? null;
      itemsToAdd.push({ name: `Reponer: ${p.name}`, storeId });
      existingNames.add(p.name.toLowerCase());
    }
  }

  // 3. Básicos de la semana para los niños (Fabio y Bruno) en Mercadona, Carrefour y Lidl
  const staplesKids: { name: string; storeName: string }[] = [
    { name: "Leche entera (pack 6L)", storeName: "Mercadona" },
    { name: "Pañales para Bruno", storeName: "Mercadona" },
    { name: "Toallitas húmedas bebé", storeName: "Mercadona" },
    { name: "Fruta variada (plátanos, manzanas, peras)", storeName: "Carrefour" },
    { name: "Yogures naturales sin azúcar", storeName: "Mercadona" },
    { name: "Pan artesano de hogaza para congelar", storeName: "Lidl" },
  ];

  for (const s of staplesKids) {
    if (!existingNames.has(s.name.toLowerCase())) {
      const storeId = storeMap.get(s.storeName.toLowerCase()) ?? null;
      itemsToAdd.push({ name: s.name, storeId });
      existingNames.add(s.name.toLowerCase());
    }
  }

  // Insertar en la base de datos
  for (const item of itemsToAdd) {
    await addShopping(item.name, { storeId: item.storeId });
  }

  return {
    addedCount: itemsToAdd.length,
    itemsAdded: itemsToAdd.map((i) => i.name),
  };
}
