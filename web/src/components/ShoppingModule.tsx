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
import { TicketManagerModal } from "./TicketManagerModal";
import { IconCamera } from "./Icons";

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
  const [viewMode, setViewMode] = useState<"store_chips" | "grouped">("store_chips");
  const [showCompleted, setShowCompleted] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
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

  const pendingItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);
  const checkedCount = checkedItems.length;
  const pendingCount = pendingItems.length;
  const inCartCount = pendingItems.filter((i) => i.in_cart).length;
  const totalItems = items.length;
  const progressPercent = totalItems > 0 ? Math.round(((checkedCount + inCartCount) / totalItems) * 100) : 0;

  const storeMap = new Map(stores.map((s) => [s.id, s]));
  const memberMap = new Map((members || []).map((m) => [m.id, m]));
  const stapleNamesSet = new Set(staples.map((st) => st.name.trim().toLowerCase()));

  // Filtrado de items pendientes según la tienda seleccionada
  const filteredPendingItems =
    selectedStore === "all"
      ? pendingItems
      : pendingItems.filter((i) => i.store_id === selectedStore);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const fd = new FormData();
    fd.append("name", newItemName);
    // Si hay una tienda seleccionada en los filtros o en el selector, usarla
    const targetStore = newItemStore || (selectedStore !== "all" ? String(selectedStore) : "");
    if (targetStore) fd.append("storeId", targetStore);
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
      setSelectedStore("all");
    });
  };

  // Render individual item row con diseño vertical mobile-first
  const renderItemCard = (item: ShoppingItem) => {
    const st = item.store_id ? storeMap.get(item.store_id) : null;
    const author = item.added_by ? memberMap.get(item.added_by) : null;
    const isStaple = stapleNamesSet.has(item.name.trim().toLowerCase());

    return (
      <div
        key={item.id}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.75rem 0.9rem",
          background: item.checked
            ? "rgba(255, 255, 255, 0.02)"
            : item.in_cart
            ? "rgba(52, 199, 89, 0.08)"
            : "var(--apple-surface)",
          borderRadius: "var(--radius-md)",
          border: item.checked
            ? "1px solid rgba(255, 255, 255, 0.05)"
            : item.in_cart
            ? "1px solid rgba(52, 199, 89, 0.35)"
            : "1px solid var(--apple-border)",
          opacity: item.checked ? 0.45 : 1,
          transition: "all 0.15s var(--ease-spring)",
        }}
      >
        {/* Fila superior: Checkbox grande táctil + Nombre completo (sin truncar) + Store Badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", width: "100%" }}>
          <button
            type="button"
            onClick={() => startTransition(() => toggleShoppingAction(item.id))}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              border: item.checked
                ? "2px solid var(--apple-green)"
                : item.in_cart
                ? "2px solid var(--apple-green)"
                : "2px solid var(--apple-border-strong)",
              background: item.checked ? "var(--apple-green)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              marginTop: "2px",
              transition: "all 0.15s ease",
            }}
            title={item.checked ? "Desmarcar" : "Completar compra"}
          >
            {item.checked && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: "0.96rem",
                fontWeight: item.in_cart ? 600 : 500,
                color: item.checked ? "var(--apple-text-tertiary)" : item.in_cart ? "var(--apple-green)" : "var(--apple-text)",
                textDecoration: item.checked ? "line-through" : "none",
                lineHeight: "1.35",
                display: "block",
                wordBreak: "break-word",
              }}
            >
              {item.name}
            </span>
            {item.quantity && item.quantity !== "1" && (
              <span style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginTop: "0.15rem", display: "inline-block" }}>
                Cantidad: {item.quantity}
              </span>
            )}
          </div>

          {/* Badge de Supermercado */}
          {st && (
            <span
              style={{
                fontSize: "0.72rem",
                padding: "0.2rem 0.55rem",
                borderRadius: "var(--radius-full)",
                background: `${st.color}18`,
                color: st.color,
                fontWeight: 600,
                border: `1px solid ${st.color}33`,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {st.name}
            </span>
          )}
        </div>

        {/* Fila inferior de acciones: Botón "En el carro", Quién lo añadió, Favorito y Eliminar */}
        {!item.checked && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.45rem",
              borderTop: "1px solid var(--apple-border)",
              marginTop: "0.15rem",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
              {/* Toggle de carro */}
              <button
                type="button"
                onClick={() => startTransition(() => toggleInCartAction(item.id))}
                disabled={isPending}
                style={{
                  background: item.in_cart ? "var(--apple-green)" : "rgba(255, 255, 255, 0.06)",
                  color: item.in_cart ? "#fff" : "var(--apple-text-secondary)",
                  border: item.in_cart ? "1px solid var(--apple-green)" : "1px solid var(--apple-border)",
                  borderRadius: "var(--radius-full)",
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  cursor: "pointer",
                  minHeight: "32px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🛒</span>
                <span>{item.in_cart ? "En el carro" : "+ Carro"}</span>
              </button>

              {/* Badge autor */}
              {author && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    background: `${author.color}15`,
                    color: author.color,
                    fontWeight: 500,
                    border: `1px solid ${author.color}30`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <span>{author.emoji}</span>
                  <span>{author.name}</span>
                </span>
              )}

              {/* Favorito / Básico */}
              <button
                type="button"
                onClick={() => handleToggleItemStaple(item)}
                disabled={isPending}
                className="btn-ghost"
                title={isStaple ? "Quitar de básicos" : "Guardar como básico"}
                style={{
                  padding: "0.25rem 0.45rem",
                  fontSize: "0.95rem",
                  color: isStaple ? "#f59e0b" : "var(--apple-text-tertiary)",
                  minHeight: "32px",
                  minWidth: "32px",
                }}
              >
                {isStaple ? "⭐" : "☆"}
              </button>
            </div>

            {/* Eliminar con target táctil cómodo */}
            <button
              onClick={() => startTransition(() => deleteShoppingAction(item.id))}
              className="btn-ghost"
              style={{
                color: "var(--apple-text-tertiary)",
                fontSize: "0.85rem",
                padding: "0.35rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                minHeight: "32px",
                minWidth: "32px",
              }}
              title="Eliminar producto"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ padding: "1.1rem 0.95rem" }}>
      {/* ── Cabecera Principal ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.95rem",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-blue-subtle)",
              color: "var(--apple-blue)",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            🛒
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Lista de la Compra
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--apple-green-subtle)",
                  color: "var(--apple-green)",
                  fontWeight: 600,
                }}
              >
                {pendingCount} pendientes
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
              Gestión inteligente por supermercados
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
              padding: "0.4rem 0.75rem",
              background: "rgba(59, 130, 246, 0.12)",
              color: "var(--apple-blue)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              fontWeight: 600,
              borderRadius: "var(--radius-full)",
            }}
            title="Analiza precios entre supermercados y optimiza el ahorro"
          >
            <span>{isOptimizing ? "⏳" : "⚡"}</span>
            <span>{isOptimizing ? "Calculando..." : "Optimizar Súper"}</span>
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
              padding: "0.4rem 0.75rem",
              background: "var(--apple-green)",
              boxShadow: "0 3px 10px rgba(52, 199, 89, 0.3)",
              borderRadius: "var(--radius-full)",
            }}
            title="Añade ingredientes de las cenas y básicos gastados para la compra del sábado"
          >
            <span>🧺</span>
            <span>Compra Sábado</span>
          </button>

          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="btn-secondary"
            style={{
              fontSize: "0.78rem",
              padding: "0.4rem 0.75rem",
              background: "var(--apple-blue-subtle)",
              color: "var(--apple-blue)",
              border: "1px solid var(--apple-blue)",
              fontWeight: 600,
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
            title="Escanear ticket de compra para tachar lo comprado y actualizar despensa"
          >
            <IconCamera size={14} />
            <span>Escanear Ticket</span>
          </button>
        </div>
      </div>

      {/* ── Barra de Progreso de Compra en el Súper ── */}
      {pendingCount > 0 && (
        <div
          style={{
            background: "var(--apple-surface-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem 0.85rem",
            marginBottom: "0.95rem",
            border: "1px solid var(--apple-border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: "0.35rem" }}>
            <span style={{ color: "var(--apple-text-secondary)" }}>
              🛒 En el carro físico: <b>{inCartCount}</b> de {pendingCount}
            </span>
            <span style={{ fontWeight: 600, color: inCartCount > 0 ? "var(--apple-green)" : "var(--apple-text-secondary)" }}>
              {Math.round((inCartCount / pendingCount) * 100)}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round((inCartCount / pendingCount) * 100)}%`,
                height: "100%",
                background: "var(--apple-green)",
                borderRadius: "3px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Feedback de Optimización */}
      {optimizeFeedback && (
        <div
          style={{
            padding: "0.75rem 0.95rem",
            background: "rgba(52, 199, 89, 0.12)",
            border: "1px solid rgba(52, 199, 89, 0.3)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.82rem",
            color: "var(--apple-green)",
            marginBottom: "0.95rem",
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
            padding: "0.95rem",
            background: "var(--apple-surface-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--apple-blue)",
            marginBottom: "1rem",
            boxShadow: "0 8px 24px rgba(59, 130, 246, 0.12)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
              ✨ Distribución Económica Óptima
            </h3>
            <button
              onClick={() => setOptimization(null)}
              className="btn-ghost"
              style={{ fontSize: "0.8rem", padding: "0.2rem 0.45rem" }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.75rem" }}>
            Ahorro potencial estimado:{" "}
            <b style={{ color: "var(--apple-green)", fontSize: "0.92rem" }}>
              {optimization.estimatedSavings.toFixed(2)} €
            </b>{" "}
            repartiendo la compra en {optimization.baskets.length} establecimientos.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.85rem" }}>
            {optimization.baskets.map((basket) => (
              <div
                key={basket.storeId}
                style={{
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--apple-surface)",
                  border: `1px solid ${basket.storeColor}44`,
                  fontSize: "0.78rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: basket.storeColor }}>
                  <span>{basket.storeName} ({basket.items.length} productos)</span>
                  <span>{basket.estimatedTotal.toFixed(2)} €</span>
                </div>
                <div style={{ color: "var(--apple-text-secondary)", fontSize: "0.72rem", marginTop: "0.2rem" }}>
                  {basket.items.map((i) => i.name).join(", ")}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleApplyOptimization}
            className="btn-primary"
            style={{
              width: "100%",
              fontSize: "0.82rem",
              padding: "0.5rem 1rem",
              background: "var(--apple-blue)",
              borderRadius: "var(--radius-md)",
            }}
          >
            ✓ Aplicar distribución a la lista
          </button>
        </div>
      )}

      {/* ── Formulario Rápido Añadir Producto (Optimizado Pantallas Verticales) ── */}
      <form
        onSubmit={handleAddItem}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.45rem",
          marginBottom: "1rem",
          background: "var(--apple-surface-secondary)",
          padding: "0.75rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--apple-border)",
        }}
      >
        <div style={{ display: "flex", gap: "0.45rem" }}>
          <input
            type="text"
            placeholder="Añadir producto (ej. Plátanos)..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="input-field"
            style={{
              flex: 1,
              padding: "0.6rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.9rem",
              background: "var(--apple-surface)",
            }}
          />
          <button
            type="submit"
            disabled={isPending || !newItemName.trim()}
            className="btn-primary"
            style={{
              width: "44px",
              height: "44px",
              padding: 0,
              borderRadius: "var(--radius-sm)",
              flexShrink: 0,
              fontSize: "1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            +
          </button>
        </div>

        {/* Selector de tienda en chips horizontales rápidos */}
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingTop: "0.2rem",
          }}
        >
          <button
            type="button"
            onClick={() => setNewItemStore("")}
            style={{
              fontSize: "0.72rem",
              padding: "0.25rem 0.55rem",
              borderRadius: "var(--radius-full)",
              background: newItemStore === "" ? "var(--apple-blue)" : "var(--apple-surface)",
              color: newItemStore === "" ? "#fff" : "var(--apple-text-secondary)",
              border: "1px solid var(--apple-border)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Cualquiera
          </button>
          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setNewItemStore(String(s.id))}
              style={{
                fontSize: "0.72rem",
                padding: "0.25rem 0.55rem",
                borderRadius: "var(--radius-full)",
                background: newItemStore === String(s.id) ? `${s.color}25` : "var(--apple-surface)",
                color: newItemStore === String(s.id) ? s.color : "var(--apple-text-secondary)",
                border: newItemStore === String(s.id) ? `1px solid ${s.color}` : "1px solid var(--apple-border)",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      </form>

      {/* ── Carrusel de Básicos Habituales a 1 Toque ── */}
      <div style={{ marginBottom: "1rem" }}>
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
              padding: "0.15rem 0.45rem",
              color: isManagingStaples ? "var(--apple-blue)" : "var(--apple-text-secondary)",
              fontWeight: 600,
            }}
          >
            {isManagingStaples ? "✓ Listo" : "⚙️ Gestionar"}
          </button>
        </div>

        {/* Panel de Gestión de Básicos */}
        {isManagingStaples ? (
          <div
            style={{
              padding: "0.75rem",
              background: "var(--apple-surface-secondary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--apple-border)",
              marginBottom: "0.75rem",
            }}
          >
            <form onSubmit={handleCreateStaple} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Emoji"
                value={newStapleEmoji}
                onChange={(e) => setNewStapleEmoji(e.target.value)}
                className="input-field"
                style={{ width: "50px", textAlign: "center", fontSize: "1rem", padding: "0.3rem" }}
              />
              <input
                type="text"
                placeholder="Nombre del básico..."
                value={newStapleName}
                onChange={(e) => setNewStapleName(e.target.value)}
                className="input-field"
                style={{ flex: 1, minWidth: "130px", fontSize: "0.82rem" }}
              />
              <select
                value={newStapleStore}
                onChange={(e) => setNewStapleStore(e.target.value)}
                className="input-field"
                style={{ width: "115px", fontSize: "0.8rem", cursor: "pointer" }}
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
                style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
              >
                + Añadir
              </button>
            </form>

            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", maxHeight: "140px", overflowY: "auto" }}>
              {staples.map((st) => (
                <div
                  key={st.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.55rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    border: "1px solid var(--apple-border)",
                    fontSize: "0.76rem",
                  }}
                >
                  <span>{st.emoji}</span>
                  <span>{st.name}</span>
                  <button
                    type="button"
                    onClick={() => startTransition(() => deleteStapleAction(st.id))}
                    className="btn-ghost"
                    style={{ padding: 0, marginLeft: "0.2rem", color: "var(--apple-red)" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              overflowX: "auto",
              paddingBottom: "0.3rem",
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
                  padding: "0.35rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--apple-text)",
                  flexShrink: 0,
                  minHeight: "34px",
                }}
              >
                <span>{st.emoji}</span>
                <span>+ {st.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Filtros por Supermercado (Chips Horizontales Táctiles) ── */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: "0.25rem",
          }}
        >
          {/* Chip Todos */}
          <button
            type="button"
            onClick={() => setSelectedStore("all")}
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-full)",
              background: selectedStore === "all" ? "var(--apple-text)" : "var(--apple-surface-secondary)",
              color: selectedStore === "all" ? "var(--apple-bg)" : "var(--apple-text-secondary)",
              border: "1px solid var(--apple-border)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Todos ({pendingCount})
          </button>

          {/* Chips de cada Supermercado */}
          {stores.map((s) => {
            const count = pendingItems.filter((i) => i.store_id === s.id).length;
            const isSelected = selectedStore === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStore(s.id)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "0.4rem 0.85rem",
                  borderRadius: "var(--radius-full)",
                  background: isSelected ? `${s.color}20` : "var(--apple-surface-secondary)",
                  color: isSelected ? s.color : "var(--apple-text-secondary)",
                  border: isSelected ? `1.5px solid ${s.color}` : "1px solid var(--apple-border)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: s.color,
                  }}
                />
                <span>{s.name}</span>
                <span style={{ opacity: 0.85, fontSize: "0.72rem" }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lista de Productos Pendientes ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1.1rem" }}>
        {filteredPendingItems.length === 0 ? (
          <div
            style={{
              padding: "2rem 1rem",
              textAlign: "center",
              background: "var(--apple-surface-secondary)",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--apple-border)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>🎉</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--apple-text)" }}>
              {selectedStore === "all" ? "¡No hay nada pendiente para comprar!" : "No hay pendientes en esta tienda"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
              Añade productos con el botón superior o pídeselo a Pepe en Telegram.
            </div>
          </div>
        ) : (
          filteredPendingItems.map(renderItemCard)
        )}
      </div>

      {/* ── Sección de Productos Comprados (Colapsable y Limpiable) ── */}
      {checkedCount > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--apple-border)",
            paddingTop: "0.85rem",
            marginTop: "0.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className="btn-ghost"
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--apple-text-secondary)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span>{showCompleted ? "▼" : "▶"}</span>
              <span>Comprados ({checkedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => startTransition(() => clearCheckedShoppingAction())}
              disabled={isPending}
              className="btn-ghost"
              style={{
                fontSize: "0.76rem",
                color: "var(--apple-red)",
                padding: "0.2rem 0.55rem",
              }}
            >
              Limpiar comprados
            </button>
          </div>

          {showCompleted && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.45rem" }}>
              {checkedItems.map(renderItemCard)}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Unificado de Gestión de Ticket (Cámara & Acciones) ── */}
      <TicketManagerModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />
    </div>
  );
}
