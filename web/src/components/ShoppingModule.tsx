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
  items,
  stores,
  staples,
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
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span>🛒</span>
          <span>Lista de la Compra</span>
          <span className="badge badge-emerald" style={{ fontSize: "0.75rem" }}>
            {items.filter((i) => !i.checked).length} pendientes
          </span>
        </h2>

        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
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
              padding: "0.35rem 0.75rem",
              background: "linear-gradient(135deg, #10b981, #059669)",
            }}
            title="Añade ingredientes de las cenas de la semana, básicos y repone la despensa gastada para comprar el sábado"
          >
            🧺 Compra Sábado (Batch Cooking)
          </button>
          {checkedCount > 0 && (
            <button
              onClick={() => startTransition(() => clearCheckedShoppingAction())}
              disabled={isPending}
              className="btn-ghost"
              style={{ fontSize: "0.8rem", color: "var(--accent-rose)" }}
            >
              Limpiar comprados ({checkedCount})
            </button>
          )}
        </div>
      </div>

      {/* Básicos +1 toque */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Básicos a 1 toque
        </div>
        <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.3rem", scrollbarWidth: "none" }}>
          {staples.map((st) => (
            <button
              key={st.id}
              onClick={() => handleQuickAdd(st)}
              disabled={isPending}
              className="btn-secondary"
              style={{
                fontSize: "0.78rem",
                padding: "0.3rem 0.65rem",
                whiteSpace: "nowrap",
                borderRadius: "var(--radius-full)",
              }}
            >
              <span>{st.emoji}</span>
              <span>+ {st.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por supermercado / tienda */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.9rem", overflowX: "auto", scrollbarWidth: "none" }}>
        <button
          onClick={() => setSelectedStore("all")}
          className={`tab-btn ${selectedStore === "all" ? "active" : ""}`}
          style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
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
              style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
            >
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: s.color, marginRight: "0.35rem" }} />
              {s.name} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Formulario añadir rápido */}
      <form onSubmit={handleAddItem} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Añadir producto (ej. Pañales talla 4)..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="input-field"
          style={{ flex: 1, fontSize: "0.88rem" }}
        />
        <select
          value={newItemStore}
          onChange={(e) => setNewItemStore(e.target.value)}
          className="input-field"
          style={{ width: "130px", fontSize: "0.82rem" }}
        >
          <option value="">Tienda...</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending || !newItemName.trim()} className="btn-primary" style={{ padding: "0.5rem 0.9rem" }}>
          +
        </button>
      </form>

      {/* Lista de productos */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "300px", overflowY: "auto" }}>
        {filteredItems.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "1.5rem 0" }}>
            No hay productos en esta sección 🎉
          </p>
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
                  padding: "0.55rem 0.75rem",
                  background: item.checked ? "transparent" : "var(--bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  opacity: item.checked ? 0.45 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => startTransition(() => toggleShoppingAction(item.id))}
                    style={{ width: "18px", height: "18px", accentColor: "var(--accent-emerald)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.9rem", textDecoration: item.checked ? "line-through" : "none" }}>
                    {item.name}
                  </span>
                  {item.quantity && (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>({item.quantity})</span>
                  )}
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {st && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-full)",
                        background: `${st.color}22`,
                        color: st.color,
                        fontWeight: 600,
                      }}
                    >
                      {st.name}
                    </span>
                  )}
                  <button
                    onClick={() => startTransition(() => deleteShoppingAction(item.id))}
                    className="btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", opacity: 0.6 }}
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
