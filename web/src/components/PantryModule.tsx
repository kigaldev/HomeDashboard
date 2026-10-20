"use client";

import { useTransition } from "react";
import { setPantryStatusAction } from "@/app/actions";
import type { PantryItem } from "@/lib/repo";

export function PantryModule({ items = [] }: { items: PantryItem[] }) {
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

  const dbNames = new Set(items.map((i) => i.name.toLowerCase()));
  const allPantry: { name: string; status: PantryItem["status"] }[] = [
    ...items,
    ...defaultPantry
      .filter((d) => !dbNames.has(d.toLowerCase()))
      .map((d) => ({ name: d, status: "ok" as const })),
  ];

  const lowOrOutCount = allPantry.filter((i) => i.status !== "ok").length;

  return (
    <div className="glass-card" style={{ padding: "1.35rem" }}>
      {/* Header Apple Style */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-teal-subtle)",
              color: "var(--apple-teal)",
            }}
          >
            📦
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Despensa & Stock
              </h2>
              {lowOrOutCount > 0 && (
                <span className="badge badge-amber" style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}>
                  {lowOrOutCount} por reponer
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Al pulsar &quot;Poco&quot; o &quot;Cero&quot; se añade automáticamente a la lista
            </p>
          </div>
        </div>
      </div>

      {/* Grid de azulejos estilo Apple Home App */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.65rem" }}>
        {allPantry.map((item) => {
          const isOk = item.status === "ok";
          const isLow = item.status === "low";
          const isOut = item.status === "out";

          return (
            <div
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 0.85rem",
                background: "var(--apple-surface-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--apple-border)",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--apple-text)" }}>
                {item.name}
              </span>

              {/* Segmented control de 3 estados estilo Apple */}
              <div
                style={{
                  display: "inline-flex",
                  padding: "2px",
                  background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                  borderRadius: "var(--radius-full)",
                  gap: "1px",
                }}
              >
                <button
                  onClick={() => handleSetStatus(item.name, "ok")}
                  disabled={isPending}
                  title="Stock suficiente"
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    background: isOk ? "var(--apple-green)" : "transparent",
                    color: isOk ? "#ffffff" : "var(--apple-text-secondary)",
                    boxShadow: isOk ? "0 2px 6px rgba(52, 199, 89, 0.3)" : "none",
                    cursor: "pointer",
                  }}
                >
                  OK
                </button>
                <button
                  onClick={() => handleSetStatus(item.name, "low")}
                  disabled={isPending}
                  title="Queda poco (añade a la compra)"
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    background: isLow ? "var(--apple-orange)" : "transparent",
                    color: isLow ? "#ffffff" : "var(--apple-text-secondary)",
                    boxShadow: isLow ? "0 2px 6px rgba(255, 149, 0, 0.3)" : "none",
                    cursor: "pointer",
                  }}
                >
                  Poco
                </button>
                <button
                  onClick={() => handleSetStatus(item.name, "out")}
                  disabled={isPending}
                  title="Agotado (añade a la compra)"
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    background: isOut ? "var(--apple-red)" : "transparent",
                    color: isOut ? "#ffffff" : "var(--apple-text-secondary)",
                    boxShadow: isOut ? "0 2px 6px rgba(255, 59, 48, 0.3)" : "none",
                    cursor: "pointer",
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
