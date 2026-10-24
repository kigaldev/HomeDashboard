"use client";

import { useState, useTransition } from "react";
import {
  addShoppingAction,
  quickAddStapleAction,
  toggleShoppingAction,
  toggleInCartAction,
  setShoppingItemStoreAction,
  optimizeShoppingBasketAction,
  applyBasketOptimizationAction,
  deleteShoppingAction,
  clearCheckedShoppingAction,
  generateSaturdayShoppingAction,
  addStapleAction,
  deleteStapleAction,
  toggleStapleAction,
} from "@/app/actions";
import type { ShoppingItem, Store, Staple, Member } from "@/lib/repo";
import type { BasketOptimizationResult } from "@/lib/pricesProvider";

export function ShoppingModule({
  items = [],
  stores = [],
  staples = [],
  members = [],
  currentMemberId = null,
}: {
  items: ShoppingItem[];
  stores: Store[];
  staples: Staple[];
  members?: Member[];
  currentMemberId?: number | null;
}) {
  const [selectedStore, setSelectedStore] = useState<number | "all">("all");
  const [viewMode, setViewMode] = useState<"grouped" | "tabs">("grouped");
  const [newItemName, setNewItemName] = useState("");
  const [newItemStore, setNewItemStore] = useState<string>("");
  const [isManagingStaples, setIsManagingStaples] = useState(false);
  const [newStapleName, setNewStapleName] = useState("");
  const [newStapleEmoji, setNewStapleEmoji] = useState("🛒");
  const [newStapleStore, setNewStapleStore] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Optimización de cesta
  const [optimization, setOptimization] = useState<BasketOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeFeedback, setOptimizeFeedback] = useState<string | null>(null);

  const checkedCount = items.filter((i) => i.checked).length;
  const pendingCount = items.filter((i) => !i.checked).length;
  const inCartCount = items.filter((i) => !i.checked && i.in_cart).length;

  const storeMap = new Map(stores.map((s) => [s.id, s]));
  const memberMap = new Map((members || []).map((m) => [m.id, m]));
  const stapleNamesSet = new Set(staples.map((st) => st.name.trim().toLowerCase()));

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const fd = new FormData();
    fd.append("name", newItemName);
    if (newItemStore) fd.append("storeId", newItemStore);
    if (currentMemberId) fd.append("by", currentMemberId.toString());
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

  const handleCreateStaple = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStapleName.trim()) return;
    const storeId = newStapleStore ? parseInt(newStapleStore, 10) : null;
    startTransition(async () => {
      await addStapleAction(newStapleName.trim(), newStapleEmoji || "🛒", storeId);
      setNewStapleName("");
      setNewStapleEmoji("🛒");
      setNewStapleStore("");
    });
  };

  const handleToggleItemStaple = (item: ShoppingItem) => {
    startTransition(async () => {
      await toggleStapleAction(item.name, "🛒", item.store_id);
    });
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    setOptimizeFeedback(null);
    try {
      const result = await optimizeShoppingBasketAction();
      setOptimization(result);
    } catch (err) {
      console.error(err);
      setOptimizeFeedback("⚠️ Error al optimizar la cesta. Inténtalo de nuevo.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = () => {
    if (!optimization) return;
    const assignments: { id: number; storeId: number }[] = [];
    for (const basket of optimization.baskets) {
      for (const item of basket.items) {
        assignments.push({ id: item.id, storeId: item.bestStoreId });
      }
    }
    startTransition(async () => {
      await applyBasketOptimizationAction(assignments);
      setOptimizeFeedback(
        `✓ ¡Lista organizada! ${assignments.length} productos distribuidos en sus supermercados más económicos. Ahorro estimado: ${optimization.estimatedSavings.toFixed(2)} €.`
      );
      setOptimization(null);
      setViewMode("grouped");
    });
  };

  // Render individual item row
  const renderItemRow = (item: ShoppingItem) => {
    const st = item.store_id ? storeMap.get(item.store_id) : null;
    const author = item.added_by ? memberMap.get(item.added_by) : null;
    const isStaple = stapleNamesSet.has(item.name.trim().toLowerCase());

    return (
      <div
        key={item.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.65rem 0.85rem",
          background: item.checked
            ? "transparent"
            : item.in_cart
            ? "rgba(52, 199, 89, 0.08)"
            : "var(--apple-surface-secondary)",
          borderRadius: "var(--radius-md)",
          border: item.in_cart
            ? "1px solid rgba(52, 199, 89, 0.35)"
            : "1px solid var(--apple-border)",
          opacity: item.checked ? 0.45 : 1,
          transition: "all 0.15s ease",
          gap: "0.5rem",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "pointer",
            flex: 1,
            minWidth: 0,
          }}
        >
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
              flexShrink: 0,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              style={{
                fontSize: "0.92rem",
                fontWeight: item.in_cart ? 600 : 500,
                textDecoration: item.checked ? "line-through" : "none",
                color: item.in_cart ? "var(--apple-green)" : "var(--apple-text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.name}
            </span>
            {item.quantity && (
              <span style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)" }}>
                {item.quantity}
              </span>
            )}
          </div>
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
          {/* Toggle rápido de "En el carro" */}
          {!item.checked && (
            <button
              type="button"
              onClick={() => startTransition(() => toggleInCartAction(item.id))}
              disabled={isPending}
              title={item.in_cart ? "Quitar del carro" : "Añadir al carro físico"}
              style={{
                background: item.in_cart ? "var(--apple-green)" : "rgba(255, 255, 255, 0.05)",
                color: item.in_cart ? "#fff" : "var(--apple-text-secondary)",
                border: item.in_cart ? "1px solid var(--apple-green)" : "1px solid var(--apple-border)",
                borderRadius: "var(--radius-full)",
                padding: "0.22rem 0.55rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>🛒</span>
              <span>{item.in_cart ? "En el carro" : "+ Carro"}</span>
            </button>
          )}

          {/* Badge de autor (Kike o Lara) */}
          {author && (
            <span
              title={`Añadido por ${author.name}`}
              style={{
                fontSize: "0.72rem",
                padding: "0.15rem 0.45rem",
                borderRadius: "var(--radius-full)",
                background: `${author.color}1a`,
                color: author.color,
                fontWeight: 500,
                border: `1px solid ${author.color}33`,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
              }}
            >
              <span>{author.emoji}</span>
              <span>{author.name}</span>
            </span>
          )}

          {/* Toggle para indicar si es básico */}
          <button
            type="button"
            onClick={() => handleToggleItemStaple(item)}
            disabled={isPending}
            className="btn-ghost"
            title={isStaple ? "Quitar de básicos habituales" : "Guardar como básico habitual"}
            style={{
              padding: "0.2rem 0.4rem",
              fontSize: "0.85rem",
              color: isStaple ? "#f59e0b" : "var(--apple-text-tertiary)",
            }}
          >
            {isStaple ? "⭐" : "☆"}
          </button>

          {/* Badge o selector de tienda */}
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
              padding: "0.25rem 0.5rem",
              color: "var(--apple-text-tertiary)",
              fontSize: "0.85rem",
            }}
            title="Eliminar producto"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ padding: "1.35rem" }}>
      {/* Header Apple Style */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Lista de la Compra
              </h2>
              <span className="badge badge-emerald" style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}>
                {pendingCount} pendientes
              </span>
              {inCartCount > 0 && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(52, 199, 89, 0.15)",
                    color: "var(--apple-green)",
                    fontWeight: 600,
                  }}
                >
                  🛒 {inCartCount} en el carro
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Comparativa inteligente entre Mercadona, Carrefour, Lidl, Aldi y E.Leclerc
            </p>
          </div>
        </div>

        {/* Acciones principales de cabecera */}
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleRunOptimizer}
            disabled={isPending || isOptimizing || pendingCount === 0}
            className="btn-secondary"
            style={{
              fontSize: "0.78rem",
              padding: "0.4rem 0.85rem",
              background: "rgba(59, 130, 246, 0.12)",
              color: "var(--apple-blue)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              fontWeight: 600,
            }}
            title="Analiza precios entre supermercados y organiza la lista para ahorrar al máximo"
          >
            <span>{isOptimizing ? "⏳" : "⚡"}</span>
            <span>{isOptimizing ? "Comparando..." : "Optimizar por Súper"}</span>
          </button>

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

      {/* Banner de feedback si se aplicó optimización */}
      {optimizeFeedback && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(52, 199, 89, 0.12)",
            border: "1px solid rgba(52, 199, 89, 0.3)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.82rem",
            color: "var(--apple-green)",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{optimizeFeedback}</span>
          <button
            type="button"
            onClick={() => setOptimizeFeedback(null)}
            className="btn-ghost"
            style={{ fontSize: "0.8rem", padding: "0.1rem 0.4rem", color: "var(--apple-green)" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal / Card de Resultado de Optimización de Cesta */}
      {optimization && (
        <div
          style={{
            padding: "1rem",
            background: "var(--apple-surface-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--apple-blue)",
            marginBottom: "1.2rem",
            boxShadow: "0 8px 24px rgba(59, 130, 246, 0.12)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ fontSize: "1.2rem" }}>✨</span>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                Cesta Optimizada Inteligente
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOptimization(null)}
              className="btn-ghost"
              style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)" }}
            >
              ✕ Cerrar
            </button>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--apple-text-secondary)", margin: 0, marginBottom: "0.75rem" }}>
            {optimization.summary}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.6rem",
              marginBottom: "0.9rem",
            }}
          >
            {optimization.baskets.map((b) => (
              <div
                key={b.storeId}
                style={{
                  padding: "0.65rem 0.8rem",
                  background: "var(--apple-surface)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${b.storeColor}33`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: b.storeColor,
                    }}
                  />
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    {b.storeName}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                  <strong>{b.itemCount}</strong> productos · ~{b.estimatedTotal.toFixed(2)} €
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setOptimization(null)}
              className="btn-ghost"
              style={{ fontSize: "0.78rem" }}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleApplyOptimization}
              disabled={isPending}
              className="btn-primary"
              style={{
                fontSize: "0.78rem",
                padding: "0.4rem 0.95rem",
                background: "var(--apple-blue)",
              }}
            >
              ✓ Aplicar distribución a la lista
            </button>
          </div>
        </div>
      )}

      {/* Sección Básicos a 1 toque con Gestión Manual */}
      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--apple-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Básicos Habituales ({staples.length})
          </span>
          <button
            type="button"
            onClick={() => setIsManagingStaples(!isManagingStaples)}
            className="btn-ghost"
            style={{
              fontSize: "0.74rem",
              padding: "0.15rem 0.5rem",
              color: isManagingStaples ? "var(--apple-blue)" : "var(--apple-text-secondary)",
              fontWeight: 600,
            }}
          >
            {isManagingStaples ? "✓ Listo" : "⚙️ Gestionar básicos"}
          </button>
        </div>

        {/* Panel de Gestión de Básicos */}
        {isManagingStaples ? (
          <div
            style={{
              padding: "0.85rem",
              background: "var(--apple-surface-secondary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--apple-border)",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.65rem" }}>
              Indica qué productos quieres tener como básicos para añadirlos con un solo toque o agrega nuevos:
            </div>

            <form
              onSubmit={handleCreateStaple}
              style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}
            >
              <input
                type="text"
                placeholder="Emoji"
                value={newStapleEmoji}
                onChange={(e) => setNewStapleEmoji(e.target.value)}
                className="input-field"
                style={{ width: "55px", textAlign: "center", fontSize: "1rem", padding: "0.3rem" }}
              />
              <input
                type="text"
                placeholder="Nombre del básico (ej. Aguacates)..."
                value={newStapleName}
                onChange={(e) => setNewStapleName(e.target.value)}
                className="input-field"
                style={{ flex: 1, minWidth: "140px", fontSize: "0.82rem" }}
              />
              <select
                value={newStapleStore}
                onChange={(e) => setNewStapleStore(e.target.value)}
                className="input-field"
                style={{ width: "125px", fontSize: "0.8rem", cursor: "pointer" }}
              >
                <option value="">Cualquier súper</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isPending || !newStapleName.trim()}
                className="btn-primary"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
              >
                + Añadir básico
              </button>
            </form>

            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", maxHeight: "160px", overflowY: "auto" }}>
              {staples.map((st) => {
                const store = st.store_id ? storeMap.get(st.store_id) : null;
                return (
                  <div
                    key={st.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "var(--radius-full)",
                      background: "var(--apple-surface)",
                      border: "1px solid var(--apple-border)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <span>{st.emoji}</span>
                    <span>{st.name}</span>
                    {store && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: store.color,
                          background: `${store.color}15`,
                          padding: "0.1rem 0.35rem",
                          borderRadius: "4px",
                        }}
                      >
                        {store.name}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startTransition(() => deleteStapleAction(st.id))}
                      className="btn-ghost"
                      style={{ padding: 0, marginLeft: "0.2rem", color: "var(--apple-red)" }}
                      title="Eliminar de básicos"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              overflowX: "auto",
              paddingBottom: "0.35rem",
              scrollbarWidth: "none",
            }}
          >
            {staples.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleQuickAdd(st)}
                disabled={isPending}
                className="btn-ghost"
                style={{
                  fontSize: "0.78rem",
                  padding: "0.32rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--apple-text)",
                  flexShrink: 0,
                }}
              >
                <span>{st.emoji}</span>
                <span>+ {st.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Control de Vista: Por Supermercados (Grupos) vs Pestañas Individuales */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.85rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "var(--apple-surface-secondary)",
            padding: "2px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--apple-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={`tab-btn ${viewMode === "grouped" ? "active" : ""}`}
            style={{ padding: "0.28rem 0.75rem", fontSize: "0.76rem" }}
          >
            🛒 Por Supermercado
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tabs")}
            className={`tab-btn ${viewMode === "tabs" ? "active" : ""}`}
            style={{ padding: "0.28rem 0.75rem", fontSize: "0.76rem" }}
          >
            📑 Filtro por Pestañas
          </button>
        </div>

        {viewMode === "tabs" && (
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            <button
              onClick={() => setSelectedStore("all")}
              className={`tab-btn ${selectedStore === "all" ? "active" : ""}`}
              style={{ padding: "0.25rem 0.65rem", fontSize: "0.76rem" }}
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
                  style={{ padding: "0.25rem 0.65rem", fontSize: "0.76rem" }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: s.color,
                      marginRight: "0.3rem",
                    }}
                  />
                  {s.name} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        )}
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

      {/* Renderizado de la lista: Modo Agrupado por Supermercado o Modo Pestañas */}
      {viewMode === "grouped" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {stores.map((store) => {
            const storeItems = items.filter((i) => i.store_id === store.id);
            const pendingStoreItems = storeItems.filter((i) => !i.checked);
            const inCartStoreItems = pendingStoreItems.filter((i) => i.in_cart);

            if (storeItems.length === 0) return null;

            return (
              <div
                key={store.id}
                style={{
                  background: "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-lg)",
                  border: `1px solid ${store.color}33`,
                  padding: "0.85rem",
                }}
              >
                {/* Cabecera del Supermercado con indicador de en el carro */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.65rem",
                    paddingBottom: "0.45rem",
                    borderBottom: "1px solid var(--apple-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: store.color,
                        boxShadow: `0 0 8px ${store.color}88`,
                      }}
                    />
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                      {store.name}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                      ({pendingStoreItems.length} pendientes)
                    </span>
                  </div>

                  {pendingStoreItems.length > 0 && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.55rem",
                        borderRadius: "var(--radius-full)",
                        background: inCartStoreItems.length === pendingStoreItems.length && pendingStoreItems.length > 0
                          ? "rgba(52, 199, 89, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                        color: inCartStoreItems.length === pendingStoreItems.length && pendingStoreItems.length > 0
                          ? "var(--apple-green)"
                          : "var(--apple-text-secondary)",
                      }}
                    >
                      🛒 {inCartStoreItems.length} / {pendingStoreItems.length} en el carro
                    </span>
                  )}
                </div>

                {/* Items de este supermercado */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {storeItems.map(renderItemRow)}
                </div>
              </div>
            );
          })}

          {/* Sección para productos sin tienda asignada si los hay */}
          {items.some((i) => !i.store_id) && (
            <div
              style={{
                background: "var(--apple-surface-secondary)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--apple-border)",
                padding: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.65rem" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  🏪 Sin asignar a tienda
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                  ({items.filter((i) => !i.store_id && !i.checked).length} pendientes)
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {items.filter((i) => !i.store_id).map(renderItemRow)}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Vista en Pestañas */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            maxHeight: "360px",
            overflowY: "auto",
            paddingRight: "0.25rem",
          }}
        >
          {items
            .filter((i) => (selectedStore === "all" ? true : i.store_id === selectedStore))
            .map(renderItemRow)}
        </div>
      )}
    </div>
  );
}
