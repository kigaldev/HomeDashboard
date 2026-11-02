import { describe, it, expect } from "vitest";
import { extractRecipeFromJsonLd } from "./recipeScraper";

describe("recipeScraper (schema.org/Recipe JSON-LD)", () => {
  it("extrae correctamente una receta de un bloque JSON-LD simple", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Tortilla de calabacín y puerro",
            "description": "Cena ligera y baja en carbohidratos.",
            "prepTime": "PT15M",
            "cookTime": "PT20M",
            "recipeYield": 4,
            "recipeIngredient": [
              "2 calabacines",
              "1 puerro",
              "4 huevos ecológicos",
              "Aceite de oliva virgen extra"
            ],
            "recipeInstructions": [
              { "@type": "HowToStep", "text": "Cortar el calabacín y el puerro en rodajas finas." },
              { "@type": "HowToStep", "text": "Pochar a fuego suave con AOVE durante 15 minutos." },
              { "@type": "HowToStep", "text": "Batir los huevos, mezclar y cuajar 2 minutos por lado." }
            ]
          }
          </script>
        </head>
        <body>Contenido web</body>
      </html>
    `;

    const recipe = extractRecipeFromJsonLd(html, "https://ejemplo.com/tortilla");
    expect(recipe).not.toBeNull();
    expect(recipe?.title).toBe("Tortilla de calabacín y puerro");
    expect(recipe?.prepTimeMinutes).toBe(15);
    expect(recipe?.cookTimeMinutes).toBe(20);
    expect(recipe?.servings).toBe(4);
    expect(recipe?.ingredients.length).toBe(4);
    expect(recipe?.instructions.length).toBe(3);
    expect(recipe?.instructions[0]).toContain("Cortar el calabacín");
  });

  it("encuentra la receta dentro de un bloque @graph", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", "name": "Sitio Cocina" },
          {
            "@type": "Recipe",
            "name": "Merluza al horno con verduras",
            "recipeIngredient": ["4 lomos de merluza", "1 pimiento rojo"]
          }
        ]
      }
      </script>
    `;

    const recipe = extractRecipeFromJsonLd(html, "https://ejemplo.com/merluza");
    expect(recipe).not.toBeNull();
    expect(recipe?.title).toBe("Merluza al horno con verduras");
    expect(recipe?.ingredients).toEqual(["4 lomos de merluza", "1 pimiento rojo"]);
  });

  it("devuelve null si no hay script ld+json o no hay receta", () => {
    const html = `<html><body><p>Sin recetas aquí</p></body></html>`;
    const recipe = extractRecipeFromJsonLd(html, "https://ejemplo.com");
    expect(recipe).toBeNull();
  });
});

