import "server-only";

export interface ImportedRecipe {
  title: string;
  description: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  sourceUrl: string;
  imageUrl?: string;
}

/**
 * Parsea duraciones ISO 8601 (ej. PT30M, PT1H15M) a minutos.
 */
function parseIsoDuration(durationStr?: string): number | undefined {
  if (!durationStr || typeof durationStr !== "string") return undefined;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return undefined;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

/**
 * Extrae texto limpio de un string o nodo de instrucción.
 */
function extractInstructionText(step: unknown): string {
  if (!step) return "";
  if (typeof step === "string") return step.trim();
  if (typeof step === "object" && step !== null) {
    const s = step as Record<string, unknown>;
    if (typeof s.text === "string") return s.text.trim();
    if (typeof s.name === "string") return s.name.trim();
  }
  return "";
}

/**
 * Busca y extrae el schema Recipe en los bloques ld+json de un documento HTML.
 */
export function extractRecipeFromJsonLd(html: string, url: string): ImportedRecipe | null {
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    const rawContent = match[1]?.trim();
    if (!rawContent) continue;

    try {
      const data = JSON.parse(rawContent);
      const recipe = findRecipeObject(data);
      if (recipe) {
        return normalizeRecipeObject(recipe, url);
      }
    } catch {
      // Ignorar bloques JSON inválidos
    }
  }

  return null;
}

function findRecipeObject(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipeObject(item);
      if (found) return found;
    }
    return null;
  }

  const record = obj as Record<string, unknown>;
  const type = record["@type"];

  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
    return record;
  }

  if (record["@graph"] && Array.isArray(record["@graph"])) {
    return findRecipeObject(record["@graph"]);
  }

  return null;
}

function normalizeRecipeObject(recipe: Record<string, unknown>, url: string): ImportedRecipe {
  const title = String(recipe.name || "Receta sin título").trim();
  const description = String(recipe.description || "").trim();

  // Ingredientes
  const rawIngredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [];
  const ingredients = rawIngredients.map((i) => String(i).trim()).filter(Boolean);

  // Instrucciones
  const instructions: string[] = [];
  const rawInstructions = recipe.recipeInstructions;
  if (Array.isArray(rawInstructions)) {
    for (const item of rawInstructions) {
      if (typeof item === "object" && item !== null && (item as Record<string, unknown>)["@type"] === "HowToSection") {
        const subSteps = (item as Record<string, unknown>).itemListElement;
        if (Array.isArray(subSteps)) {
          for (const sub of subSteps) {
            const txt = extractInstructionText(sub);
            if (txt) instructions.push(txt);
          }
        }
      } else {
        const txt = extractInstructionText(item);
        if (txt) instructions.push(txt);
      }
    }
  } else if (typeof rawInstructions === "string") {
    instructions.push(rawInstructions.trim());
  }

  let imageUrl: string | undefined;
  if (typeof recipe.image === "string") {
    imageUrl = recipe.image;
  } else if (Array.isArray(recipe.image) && recipe.image.length > 0) {
    imageUrl = typeof recipe.image[0] === "string" ? recipe.image[0] : (recipe.image[0] as { url?: string })?.url;
  } else if (recipe.image && typeof recipe.image === "object" && "url" in recipe.image) {
    imageUrl = String((recipe.image as { url?: string }).url);
  }

  return {
    title,
    description,
    prepTimeMinutes: parseIsoDuration(recipe.prepTime as string),
    cookTimeMinutes: parseIsoDuration(recipe.cookTime as string),
    servings: typeof recipe.recipeYield === "number" ? recipe.recipeYield : parseInt(String(recipe.recipeYield || ""), 10) || undefined,
    ingredients,
    instructions,
    sourceUrl: url,
    imageUrl,
  };
}

/**
 * Descarga una URL y parsea el schema.org/Recipe.
 */
export async function scrapeRecipeUrl(url: string): Promise<ImportedRecipe | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HomeDashboardRecipeBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractRecipeFromJsonLd(html, url);
  } catch {
    return null;
  }
}

