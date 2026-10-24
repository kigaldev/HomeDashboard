import { getStores, type Store, type ShoppingItem } from "./repo";
import { q } from "./db";

export type PriceSource = "history" | "openprices" | "baseline";

export type ItemPriceQuote = {
  storeId: number;
  storeName: string;
  storeColor: string;
  price: number;
  source: PriceSource;
  date?: string;
};

export type OptimizedItem = {
  id: number;
  name: string;
  quantity: string | null;
  inCart: boolean;
  bestStoreId: number;
  bestStoreName: string;
  bestStoreColor: string;
  bestPrice: number;
  maxPrice: number;
  savings: number;
  source: PriceSource;
};

export type StoreBasket = {
  storeId: number;
  storeName: string;
  storeColor: string;
  itemCount: number;
  estimatedTotal: number;
  items: OptimizedItem[];
};

export type BasketOptimizationResult = {
  totalItems: number;
  totalEstimatedCost: number;
  estimatedSavings: number;
  baskets: StoreBasket[];
  summary: string;
};

/**
 * Catálogo de referencia base con precios promedio observados en España
 * para productos comunes de la cesta de la compra (Mercadona, Carrefour, Lidl, Aldi, E.Leclerc).
 */
const BASELINE_STORE_PRICES: Record<string, Record<string, number>> = {
  "leche": {
    "Mercadona": 0.91,
    "Carrefour": 0.93,
    "Lidl": 0.89,
    "Aldi": 0.89,
    "E.Leclerc": 0.92,
  },
  "pan": {
    "Mercadona": 0.65,
    "Carrefour": 0.70,
    "Lidl": 0.59,
    "Aldi": 0.59,
    "E.Leclerc": 0.62,
  },
  "huevos": {
    "Mercadona": 2.25,
    "Carrefour": 2.30,
    "Lidl": 2.19,
    "Aldi": 2.19,
    "E.Leclerc": 2.22,
  },
  "aceite": {
    "Mercadona": 7.15,
    "Carrefour": 6.89,
    "Lidl": 6.99,
    "Aldi": 6.99,
    "E.Leclerc": 6.95,
  },
  "yogur": {
    "Mercadona": 1.15,
    "Carrefour": 1.25,
    "Lidl": 1.10,
    "Aldi": 1.09,
    "E.Leclerc": 1.18,
  },
  "platanos": {
    "Mercadona": 1.99,
    "Carrefour": 1.85,
    "Lidl": 1.89,
    "Aldi": 1.89,
    "E.Leclerc": 1.79,
  },
  "manzanas": {
    "Mercadona": 2.10,
    "Carrefour": 1.99,
    "Lidl": 1.95,
    "Aldi": 1.95,
    "E.Leclerc": 1.90,
  },
  "arroz": {
    "Mercadona": 1.35,
    "Carrefour": 1.39,
    "Lidl": 1.29,
    "Aldi": 1.29,
    "E.Leclerc": 1.32,
  },
  "pasta": {
    "Mercadona": 0.89,
    "Carrefour": 0.92,
    "Lidl": 0.85,
    "Aldi": 0.85,
    "E.Leclerc": 0.88,
  },
  "tomate": {
    "Mercadona": 1.89,
    "Carrefour": 1.79,
    "Lidl": 1.75,
    "Aldi": 1.75,
    "E.Leclerc": 1.70,
  },
  "pollo": {
    "Mercadona": 6.95,
    "Carrefour": 6.49,
    "Lidl": 6.59,
    "Aldi": 6.59,
    "E.Leclerc": 6.39,
  },
  "papel higienico": {
    "Mercadona": 3.70,
    "Carrefour": 3.85,
    "Lidl": 3.49,
    "Aldi": 3.49,
    "E.Leclerc": 3.65,
  },
  "detergente": {
    "Mercadona": 4.50,
    "Carrefour": 4.29,
    "Lidl": 3.99,
    "Aldi": 3.99,
    "E.Leclerc": 4.10,
  },
  "pañales": {
    "Mercadona": 13.90,
    "Carrefour": 14.50,
    "Lidl": 12.99,
    "Aldi": 13.20,
    "E.Leclerc": 13.80,
  },
  "toallitas": {
    "Mercadona": 1.95,
    "Carrefour": 2.10,
    "Lidl": 1.85,
    "Aldi": 1.85,
    "E.Leclerc": 1.90,
  },
};

/**
 * Consulta la API pública Open Prices de Open Food Facts para buscar precios recientes en España.
 */
export async function fetchOpenPricesForQuery(productQuery: string): Promise<{ store: string; price: number }[]> {
  try {
    const cleanQuery = encodeURIComponent(productQuery.trim().toLowerCase());
    const url = `https://prices.openfoodfacts.org/api/v1/prices?page_size=10&currency=EUR&product_name__like=${cleanQuery}`;
    
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "HomeDashboard-Salamanca/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.items || !Array.isArray(data.items)) return [];

    const quotes: { store: string; price: number }[] = [];
    for (const item of data.items) {
      const price = parseFloat(item.price);
      if (isNaN(price) || price <= 0) continue;

      const locationName = item.location?.osm_name || item.location?.osm_display_name || "";
      let storeName = "Otros";
      if (/mercadona/i.test(locationName)) storeName = "Mercadona";
      else if (/carrefour/i.test(locationName)) storeName = "Carrefour";
      else if (/lidl/i.test(locationName)) storeName = "Lidl";
      else if (/aldi/i.test(locationName)) storeName = "Aldi";
      else if (/leclerc/i.test(locationName)) storeName = "E.Leclerc";

      if (storeName !== "Otros") {
        quotes.push({ store: storeName, price });
      }
    }
    return quotes;
  } catch (err) {
    console.warn("[pricesProvider] Error consultando Open Prices:", err);
    return [];
  }
}

/**
 * Encuentra o estima precios para un producto en todas las tiendas disponibles.
 */
export async function getQuotesForItem(itemName: string, stores: Store[]): Promise<ItemPriceQuote[]> {
  const normName = itemName.toLowerCase().trim();
  const quotes: ItemPriceQuote[] = [];

  // 1. Prioridad Máxima: Tu historial de tickets reales en la base de datos (Salamanca)
  try {
    const historyRows = await q<{ store_id: number; store_name: string; price: number; date: string }>(
      `select ph.store_id, s.name as store_name, ph.price::float as price, ph.date::text as date
       from price_history ph
       join stores s on s.id = ph.store_id
       where lower(ph.item_name) = lower($1)
          or lower(ph.item_name) like '%' || lower($1) || '%'
       order by ph.date desc, ph.price asc`,
      [normName],
    );

    const storeSeen = new Set<number>();
    for (const row of historyRows) {
      if (!storeSeen.has(row.store_id)) {
        storeSeen.add(row.store_id);
        const store = stores.find((s) => s.id === row.store_id);
        if (store) {
          quotes.push({
            storeId: store.id,
            storeName: store.name,
            storeColor: store.color,
            price: row.price,
            source: "history",
            date: row.date,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[pricesProvider] Error consultando price_history:", err);
  }

  // 2. Si alguna tienda falta, consultar baseline de productos comunes
  let baselineKey: string | null = null;
  for (const k of Object.keys(BASELINE_STORE_PRICES)) {
    if (normName.includes(k) || k.includes(normName)) {
      baselineKey = k;
      break;
    }
  }

  if (baselineKey) {
    const pricesByStore = BASELINE_STORE_PRICES[baselineKey];
    for (const store of stores) {
      if (store.name === "Farmacia" || store.name === "Otros") continue;
      if (!quotes.some((q) => q.storeId === store.id)) {
        const p = pricesByStore[store.name];
        if (p) {
          quotes.push({
            storeId: store.id,
            storeName: store.name,
            storeColor: store.color,
            price: p,
            source: "baseline",
          });
        }
      }
    }
  }

  return quotes;
}

/**
 * Motor de optimización de cesta:
 * Asigna cada producto pendiente al supermercado más económico,
 * calcula costes acumulados y ahorro total comparado con comprarlo todo en la opción más cara.
 */
export async function optimizeShoppingBasket(
  items: ShoppingItem[],
  stores: Store[],
): Promise<BasketOptimizationResult> {
  const pendingItems = items.filter((i) => !i.checked);
  const storeMap = new Map(stores.map((s) => [s.id, s]));

  const optimizedItems: OptimizedItem[] = [];
  let totalEstimatedCost = 0;
  let totalMaxCost = 0;

  for (const item of pendingItems) {
    const quotes = await getQuotesForItem(item.name, stores);

    if (quotes.length > 0) {
      const sorted = [...quotes].sort((a, b) => a.price - b.price);
      const best = sorted[0];
      const max = sorted[sorted.length - 1];
      const savings = Math.max(0, max.price - best.price);

      totalEstimatedCost += best.price;
      totalMaxCost += max.price;

      optimizedItems.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        inCart: Boolean(item.in_cart),
        bestStoreId: best.storeId,
        bestStoreName: best.storeName,
        bestStoreColor: best.storeColor,
        bestPrice: best.price,
        maxPrice: max.price,
        savings,
        source: best.source,
      });
    } else {
      // Si no hay datos específicos de precios, mantener la tienda asignada o la principal
      const fallbackStore = (item.store_id && storeMap.get(item.store_id)) || stores.find((s) => s.name === "Mercadona") || stores[0];
      const estPrice = 2.0; // Precio nominal promedio
      totalEstimatedCost += estPrice;
      totalMaxCost += estPrice;

      optimizedItems.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        inCart: Boolean(item.in_cart),
        bestStoreId: fallbackStore.id,
        bestStoreName: fallbackStore.name,
        bestStoreColor: fallbackStore.color,
        bestPrice: estPrice,
        maxPrice: estPrice,
        savings: 0,
        source: "baseline",
      });
    }
  }

  // Agrupar por tienda ganadora
  const basketsMap = new Map<number, StoreBasket>();
  for (const store of stores) {
    if (store.name === "Otros") continue;
    basketsMap.set(store.id, {
      storeId: store.id,
      storeName: store.name,
      storeColor: store.color,
      itemCount: 0,
      estimatedTotal: 0,
      items: [],
    });
  }

  for (const opt of optimizedItems) {
    let basket = basketsMap.get(opt.bestStoreId);
    if (!basket) {
      const store = storeMap.get(opt.bestStoreId);
      basket = {
        storeId: opt.bestStoreId,
        storeName: store?.name || "Supermercado",
        storeColor: store?.color || "#3b82f6",
        itemCount: 0,
        estimatedTotal: 0,
        items: [],
      };
      basketsMap.set(opt.bestStoreId, basket);
    }
    basket.itemCount += 1;
    basket.estimatedTotal += opt.bestPrice;
    basket.items.push(opt);
  }

  const activeBaskets = Array.from(basketsMap.values())
    .filter((b) => b.itemCount > 0)
    .sort((a, b) => b.itemCount - a.itemCount);

  const estimatedSavings = Math.max(0, totalMaxCost - totalEstimatedCost);

  const summary = `Cesta de ${pendingItems.length} productos optimizada en ${activeBaskets.length} supermercados. Ahorro estimado: ${estimatedSavings.toFixed(2)} €.`;

  return {
    totalItems: pendingItems.length,
    totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2)),
    estimatedSavings: parseFloat(estimatedSavings.toFixed(2)),
    baskets: activeBaskets,
    summary,
  };
}
