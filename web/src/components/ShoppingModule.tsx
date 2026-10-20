"use client";

import { useState, useTransition } from "react";
import {
  addShoppingAction,
  quickAddStapleAction,
  toggleShoppingAction,
  deleteShoppingAction,
  clearCheckedShoppingAction,
  generateSaturdayShoppingAction,
} from "@/app/actions";
import type { ShoppingItem, Store, Staple } from "@/lib/repo";

export function ShoppingModule({
  items = [],
  stores = [],
  staples = [],
}: {
  items: ShoppingItem[];
  stores: Store[];
  staples: Staple[];
}) {
  const [selectedStore, setSelectedStore] = useState<number | "all">("all");
  const [newItemName, setNewItemName] = useState("");
  const [newItemStore, setNewItemStore] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const filteredItems = items.filter((i) => {
    if (selectedStore === "all") return true;
    return i.store_id === selectedStore;
  });

  const checkedCount = items.filter((i) => i.checked).length;
  const pendingCount = items.filter((i) => !i.checked).length;
  const storeMap = new Map(stores.map((s) => [s.id, s]));

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const fd = new FormData();
    fd.append("name", newItemName);
    if (newItemStore) fd.append("storeId", newItemStore);
    startTransition(async () => {
      await addShoppingAction(fd);
      setNewItemName("");
      setNewItemStore("");
    });
  };

  const handleQuickAdd = (staple: Staple) => {
    startTransition(async () => {
      await quickAddStapleAction(staple.name, staple.store_id);
    });
  };

  return (
    <div className="glass-card" style={{ padding: "1.35rem" }}>
      {/* Header Apple Style */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-blue-subtle)",
              color: "var(--apple-blue)",
            }}
          >
            🛒
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Lista de la Compra
              </h2>
              <span className="badge badge-emerald" style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}>
                {pendingCount} pendientes
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Organizada por súper · Mercadona, Carrefour, Lidl y Farmacia
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() =>
              startTransition(async () => {
                await generateSaturdayShoppingAction();
              })
            }
            disabled={isPending}
            className="btn-primary"
            style={{
              fontSize: "0.78rem",
              padding: "0.4rem 0.85rem",
              background: "var(--apple-green)",
              boxShadow: "0 3px 10px rgba(52, 199, 89, 0.3)",
            }}
            title="Añade ingredientes de las cenas de la semana, básicos y repone la despensa gastada para comprar el sábado"
          >
            <span>🧺</span>
            <span>Compra Sábado</span>
          </button>
          {checkedCount > 0 && (
            <button
              onClick={() => startTransition(() => clearCheckedShoppingAction())}
              disabled={isPending}
              className="btn-ghost"
              style={{ fontSize: "0.78rem", color: "var(--apple-red)" }}
            >
              Limpiar ({checkedCount})
            </button>
          )}
        </div>
      </div>

      {/* Básicos a 1 toque (Carrusel de Píldoras Apple) */}
      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--apple-text-secondary)", marginBottom: "0.45rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Básicos a 1 toque
        </div>
        <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.25rem", scrollbarWidth: "none" }}>
          {staples.map((st) => (
            <button
              key={st.id}
              onClick={() => handleQuickAdd(st)}
              disabled={isPending}
              className="btn-secondary"
              style={{
                fontSize: "0.78rem",
                padding: "0.32rem 0.75rem",
                whiteSpace: "nowrap",
                borderRadius: "var(--radius-full)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span>{st.emoji}</span>
              <span>+ {st.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por supermercado (Segmented Pills) */}
      <div
        style={{
          display: "flex",
          gap: "0.35rem",
          marginBottom: "1rem",
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "2px",
        }}
      >
        <button
          onClick={() => setSelectedStore("all")}
          className={`tab-btn ${selectedStore === "all" ? "active" : ""}`}
          style={{ padding: "0.32rem 0.85rem", fontSize: "0.8rem" }}
        >
          Todas
        </button>
        {stores.map((s) => {
          const count = items.filter((i) => !i.checked && i.store_id === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedStore(s.id)}
              className={`tab-btn ${selectedStore === s.id ? "active" : ""}`}
              style={{ padding: "0.32rem 0.85rem", fontSize: "0.8rem" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: s.color,
                  marginRight: "0.35rem",
                  boxShadow: `0 0 6px ${s.color}66`,
                }}
              />
              {s.name} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Formulario añadir rápido estilo iOS Form */}
      <form onSubmit={handleAddItem} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem" }}>
        <input
          type="text"
          placeholder="Añadir producto (ej. Plátanos de Canarias)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="input-field"
          style={{ flex: 1 }}
        />
        <select
          value={newItemStore}
          onChange={(e) => setNewItemStore(e.target.value)}
          className="input-field"
          style={{ width: "135px", cursor: "pointer" }}
        >
          <option value="">Tienda...</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending || !newItemName.trim()}
          className="btn-primary"
          style={{ width: "42px", height: "42px", padding: 0, borderRadius: "var(--radius-sm)", flexShrink: 0 }}
        >
          +
        </button>
      </form>

      {/* Lista de productos estilo Apple Reminders */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "320px", overflowY: "auto", paddingRight: "0.25rem" }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--apple-text-secondary)" }}>
            <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "0.4rem" }}>✨</span>
            <p style={{ fontSize: "0.9rem", fontWeight: 500, margin: 0 }}>Todo al día en esta tienda</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const st = item.store_id ? storeMap.get(item.store_id) : null;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.65rem 0.85rem",
                  background: item.checked ? "transparent" : "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--apple-border)",
                  opacity: item.checked ? 0.45 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => startTransition(() => toggleShoppingAction(item.id))}
                    style={{
                      width: "20px",
                      height: "20px",
                      accentColor: "var(--apple-green)",
                      cursor: "pointer",
                      borderRadius: "6px",
                    }}
                  />
                  <span style={{ fontSize: "0.92rem", fontWeight: 500, textDecoration: item.checked ? "line-through" : "none", color: "var(--apple-text)" }}>
                    {item.name}
                  </span>
                  {item.quantity && (
                    <span style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)" }}>({item.quantity})</span>
                  )}
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                  {st && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.15rem 0.55rem",
                        borderRadius: "var(--radius-full)",
                        background: `${st.color}1a`,
                        color: st.color,
                        fontWeight: 600,
                        border: `1px solid ${st.color}33`,
                      }}
                    >
                      {st.name}
                    </span>
                  )}
                  <button
                    onClick={() => startTransition(() => deleteShoppingAction(item.id))}
                    className="btn-ghost"
                    style={{
                      width: "24px",
                      height: "24px",
                      padding: 0,
                      borderRadius: "50%",
                      justifyContent: "center",
                      color: "var(--apple-text-secondary)",
                    }}
                    title="Eliminar producto"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
