"use client";

import { useTransition } from "react";
import { setPantryStatusAction } from "@/app/actions";
import type { PantryItem } from "@/lib/repo";

export function PantryModule({ items }: { items: PantryItem[] }) {
  const [isPending, startTransition] = useTransition();

  const handleSetStatus = (name: string, status: PantryItem["status"]) => {
    startTransition(async () => {
      await setPantryStatusAction(name, status);
    });
  };

  const defaultPantry = [
    "Aceite de oliva",
    "Leche",
    "Huevos",
    "Café",
    "Arroz",
    "Pasta",
    "Pañales",
    "Toallitas",
    "Detergente",
    "Papel higiénico",
  ];

  // Merge items from DB with common default pantry items
  const dbNames = new Set(items.map((i) => i.name.toLowerCase()));
  const allPantry: { name: string; status: PantryItem["status"] }[] = [
    ...items,
    ...defaultPantry
      .filter((d) => !dbNames.has(d.toLowerCase()))
      .map((d) => ({ name: d, status: "ok" as const })),
  ];

  return (
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span>📦</span>
          <span>Despensa &amp; Stock</span>
        </h2>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Si marcas &quot;Queda poco&quot;, se añade a la compra
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.6rem" }}>
        {allPantry.map((item) => {
          return (
            <div
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0.75rem",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{item.name}</span>
              <div style={{ display: "flex", gap: "0.2rem" }}>
                <button
                  onClick={() => handleSetStatus(item.name, "ok")}
                  disabled={isPending}
                  title="Stock correcto"
                  style={{
                    padding: "0.2rem 0.45rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    background: item.status === "ok" ? "var(--accent-emerald)" : "var(--border-subtle)",
                    color: item.status === "ok" ? "white" : "var(--text-muted)",
                  }}
                >
                  OK
                </button>
                <button
                  onClick={() => handleSetStatus(item.name, "low")}
                  disabled={isPending}
                  title="Queda poco (añade a la compra)"
                  style={{
                    padding: "0.2rem 0.45rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    background: item.status === "low" ? "var(--accent-amber)" : "var(--border-subtle)",
                    color: item.status === "low" ? "white" : "var(--text-muted)",
                  }}
                >
                  Poco
                </button>
                <button
                  onClick={() => handleSetStatus(item.name, "out")}
                  disabled={isPending}
                  title="Agotado (añade a la compra)"
                  style={{
                    padding: "0.2rem 0.45rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    background: item.status === "out" ? "var(--accent-rose)" : "var(--border-subtle)",
                    color: item.status === "out" ? "white" : "var(--text-muted)",
                  }}
                >
                  Cero
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
