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
import { ManualExpenseModal } from "./ManualExpenseModal";
import { IconCamera, IconChevronDown, IconChevronRight } from "./Icons";

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
  const [isManualExpenseOpen, setIsManualExpenseOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemStore, setNewItemStore] = useState<string>("");
  const [isManagingStaples, setIsManagingStaples] = useState(false);
  const [newStapleName, setNewStapleName] = useState("");
  const [newStapleEmoji, setNewStapleEmoji] = useState("🛒");
  const [newStapleStore, setNewStapleStore] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Estados colapsables para ahorrar espacio vertical (plegados por defecto)
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStoreFilters, setShowStoreFilters] = useState(false);
  const [showStaples, setShowStaples] = useState(false);
  const [showPendingList, setShowPendingList] = useState(true);

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

function getShoppingItemEmoji(name: string, staplesList: Staple[] = []): string {
  const clean = name.trim().toLowerCase();
  const matchedStaple = staplesList.find((s) => s.name.trim().toLowerCase() === clean);
  if (matchedStaple?.emoji) return matchedStaple.emoji;
  if (clean.includes("leche")) return "🥛";
  if (clean.includes("huevo")) return "🥚";
  if (clean.includes("aceite")) return "🫒";
  if (clean.includes("café") || clean.includes("cafe")) return "☕";
  if (clean.includes("arroz")) return "🍚";
  if (clean.includes("pasta") || clean.includes("macarron") || clean.includes("espaguet")) return "🍝";
  if (clean.includes("pan") || clean.includes("tostad") || clean.includes("barra")) return "🥖";
  if (clean.includes("pañal") || clean.includes("panal")) return "🧷";
  if (clean.includes("toallit")) return "🧻";
  if (clean.includes("detergente") || clean.includes("suavizante") || clean.includes("lavavajill")) return "🫧";
  if (clean.includes("higiénico") || clean.includes("higienico") || clean.includes("papel")) return "🧻";
  if (clean.includes("agua") || clean.includes("zumo") || clean.includes("refresco")) return "🧃";
  if (clean.includes("fruta") || clean.includes("manzana") || clean.includes("platano") || clean.includes("plátano") || clean.includes("naranja") || clean.includes("fresa") || clean.includes("pera")) return "🍎";
  if (clean.includes("verdura") || clean.includes("tomate") || clean.includes("cebolla") || clean.includes("lechuga") || clean.includes("zanahoria") || clean.includes("patata") || clean.includes("calabacín") || clean.includes("calabacin") || clean.includes("judia") || clean.includes("pimiento")) return "🥦";
  if (clean.includes("pescado") || clean.includes("atun") || clean.includes("atún") || clean.includes("salmon") || clean.includes("salmón") || clean.includes("merluza") || clean.includes("gallo") || clean.includes("lenguado") || clean.includes("bacalao")) return "🐟";
  if (clean.includes("carne") || clean.includes("pollo") || clean.includes("ternera") || clean.includes("cerdo") || clean.includes("pavo") || clean.includes("lomo") || clean.includes("hamburguesa") || clean.includes("salchicha") || clean.includes("filete")) return "🥩";
  if (clean.includes("yogur") || clean.includes("queso") || clean.includes("quesito") || clean.includes("mantequilla")) return "🧀";
  if (clean.includes("galleta") || clean.includes("cereal") || clean.includes("chocolate") || clean.includes("dulce")) return "🍪";
  if (clean.includes("legumbre") || clean.includes("lenteja") || clean.includes("garbanzo") || clean.includes("alubia")) return "🫘";
  if (clean.includes("cerveza") || clean.includes("vino")) return "🍷";
  if (clean.includes("champu") || clean.includes("champú") || clean.includes("gel") || clean.includes("jabon") || clean.includes("jabón") || clean.includes("pasta dental") || clean.includes("dientes")) return "🧴";
  if (clean.includes("dalsy") || clean.includes("apiretal") || clean.includes("suero") || clean.includes("medic")) return "💊";
  return "🛒";
}

  // Render individual item card optimizado para smartphone (estilo despensa con botón de carrito a la derecha)
  const renderItemCard = (item: ShoppingItem) => {
    const st = item.store_id ? storeMap.get(item.store_id) : null;
    const author = item.added_by ? memberMap.get(item.added_by) : null;
    const isStaple = stapleNamesSet.has(item.name.trim().toLowerCase());
    const emoji = getShoppingItemEmoji(item.name, staples);

    return (
      <div
        key={item.id}
        className="liquid-glass"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.85rem 1rem",
          background: item.checked
            ? "rgba(255, 255, 255, 0.02)"
            : item.in_cart
            ? "rgba(52, 199, 89, 0.12)"
            : "var(--liquid-glass-bg-subtle, rgba(255, 255, 255, 0.04))",
          borderRadius: "var(--radius-lg)",
          border: item.checked
            ? "1px solid rgba(255, 255, 255, 0.06)"
            : item.in_cart
            ? "1.5px solid rgba(52, 199, 89, 0.5)"
            : "1px solid var(--liquid-glass-border, rgba(255, 255, 255, 0.1))",
          boxShadow: item.in_cart
            ? "0 4px 14px rgba(52, 199, 89, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            : "0 2px 8px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          opacity: item.checked ? 0.45 : 1,
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
        }}
      >
        {/* Lado izquierdo + centro: Checkbox táctil + Emoji grande + Datos del producto */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
          {/* Checkbox circular táctil grande (32px x 32px) */}
          <button
            type="button"
            onClick={() => startTransition(() => toggleShoppingAction(item.id))}
            className="touch-target"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: item.checked
                ? "2px solid var(--apple-green)"
                : item.in_cart
                ? "2px solid var(--apple-green)"
                : "2px solid var(--apple-border-strong, rgba(255, 255, 255, 0.28))",
              background: item.checked ? "var(--apple-green)" : "rgba(255, 255, 255, 0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
            title={item.checked ? "Desmarcar" : "Completar compra"}
            aria-label={item.checked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`}
          >
            {item.checked ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : item.in_cart ? (
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--apple-green)" }} />
            ) : null}
          </button>

          {/* Icono Grande del Producto (ejemplo despensa) */}
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-md)",
              background: "rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.55rem",
              flexShrink: 0,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            }}
          >
            {emoji}
          </div>

          {/* Texto y datos */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: item.checked ? "var(--apple-text-tertiary)" : item.in_cart ? "var(--apple-green)" : "var(--apple-text)",
                  textDecoration: item.checked ? "line-through" : "none",
                  lineHeight: "1.3",
                  wordBreak: "break-word",
                }}
              >
                {item.name}
              </span>

              {/* Estrella básico */}
              {!item.checked && (
                <button
                  type="button"
                  onClick={() => handleToggleItemStaple(item)}
                  disabled={isPending}
                  className="btn-ghost"
                  title={isStaple ? "Quitar de básicos" : "Guardar como básico habitual"}
                  style={{
                    padding: "0.1rem 0.25rem",
                    fontSize: "0.85rem",
                    color: isStaple ? "#f59e0b" : "var(--apple-text-tertiary)",
                    opacity: isStaple ? 1 : 0.4,
                    cursor: "pointer",
                  }}
                >
                  {isStaple ? "⭐" : "☆"}
                </button>
              )}
            </div>

            {/* Badges de soporte: Cantidad, Tienda, Autor */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
              {item.quantity && item.quantity !== "1" && (
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    color: "var(--apple-text-secondary)",
                    background: "rgba(255, 255, 255, 0.06)",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  Cant: {item.quantity}
                </span>
              )}

              {st && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.12rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    background: `${st.color}20`,
                    color: st.color,
                    fontWeight: 700,
                    border: `1px solid ${st.color}40`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: st.color }} />
                  {st.name}
                </span>
              )}

              {author && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--apple-text-tertiary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.2rem",
                  }}
                >
                  <span>{author.emoji}</span>
                  <span>{author.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* LADO DERECHO: BOTÓN DEL CARRITO A LA DERECHA (PULGAR SMARTPHONE A UNA MANO) */}
        {!item.checked && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
            {/* Botón Carrito Grande Ergonómico */}
            <button
              type="button"
              onClick={() => startTransition(() => toggleInCartAction(item.id))}
              disabled={isPending}
              className="touch-target"
              style={{
                minWidth: "88px",
                height: "46px",
                borderRadius: "var(--radius-lg)",
                background: item.in_cart
                  ? "var(--apple-green)"
                  : "var(--liquid-glass-bg-subtle, rgba(255, 255, 255, 0.08))",
                color: item.in_cart ? "#ffffff" : "var(--apple-text)",
                border: item.in_cart
                  ? "1px solid var(--apple-green)"
                  : "1px solid var(--liquid-glass-border, rgba(255, 255, 255, 0.16))",
                boxShadow: item.in_cart
                  ? "0 3px 12px rgba(52, 199, 89, 0.45)"
                  : "0 2px 6px rgba(0, 0, 0, 0.2)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0 0.8rem",
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.2s var(--ease-spring)",
              }}
              title={item.in_cart ? "Quitar del carro físico" : "Añadir al carro físico"}
              aria-label={item.in_cart ? `Quitar ${item.name} del carrito` : `Meter ${item.name} en el carrito`}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>🛒</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {item.in_cart ? "En carro" : "+ Carro"}
              </span>
            </button>

            {/* Botón eliminar discreto */}
            <button
              type="button"
              onClick={() => startTransition(() => deleteShoppingAction(item.id))}
              className="btn-ghost touch-target"
              style={{
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-sm)",
                color: "var(--apple-text-tertiary)",
                fontSize: "0.85rem",
                opacity: 0.55,
                padding: 0,
              }}
              title={`Eliminar ${item.name}`}
              aria-label={`Eliminar ${item.name}`}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      {/* ── TARJETA 1: Herramientas y Gestión de Compra ── */}
      <div className="liquid-glass" style={{ padding: "1.1rem 1rem", borderRadius: "var(--radius-xl)" }}>
        {/* Cabecera de Herramientas */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.85rem",
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
                width: "38px",
                height: "38px",
                borderRadius: "11px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.15rem",
              }}
            >
              🛍️
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "var(--apple-text)" }}>
                Herramientas de Compra
              </h2>
              <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                Tickets, optimizador y supermercados
              </p>
            </div>
          </div>

          {/* Acciones principales de cabecera */}
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleRunOptimizer}
              disabled={isPending || isOptimizing || pendingCount === 0}
              className="btn-secondary touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.38rem 0.7rem",
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
              className="btn-primary touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.38rem 0.7rem",
                background: "var(--apple-green)",
                boxShadow: "0 2px 8px rgba(52, 199, 89, 0.3)",
                borderRadius: "var(--radius-full)",
              }}
              title="Añade ingredientes de las cenas y básicos gastados para la compra del sábado"
            >
              <span>🧺</span>
              <span>Compra Sábado</span>
            </button>

            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="btn-secondary touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.38rem 0.7rem",
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

            <button
              onClick={() => setIsManualExpenseOpen(true)}
              className="btn-secondary touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.38rem 0.7rem",
                background: "rgba(255, 255, 255, 0.08)",
                color: "var(--apple-text)",
                border: "1px solid var(--apple-border)",
                fontWeight: 600,
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
              title="Añadir un gasto o ticket manual sin foto"
            >
              <span>➕</span>
              <span>Gasto Manual</span>
            </button>
          </div>
        </div>

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

      {/* ── Formulario Rápido Añadir Producto (Colapsable / Compacto) ── */}
      <div style={{ marginBottom: "0.85rem" }}>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          aria-expanded={showAddForm}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.65rem 0.95rem",
            borderRadius: "var(--radius-md)",
            background: "var(--apple-surface-secondary)",
            border: "1px solid var(--apple-border)",
            color: "var(--apple-text)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "var(--apple-blue-subtle)",
                color: "var(--apple-blue)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                fontWeight: 700,
              }}
            >
              +
            </span>
            <span style={{ fontSize: "0.86rem", fontWeight: 600 }}>
              {showAddForm ? "Añadir producto a la lista" : "Añadir nuevo producto..."}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: "var(--apple-text-secondary)",
            }}
          >
            {showAddForm ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </div>
        </button>

        {showAddForm && (
          <form
            onSubmit={(e) => {
              handleAddItem(e);
            }}
            style={{
              marginTop: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
              background: "var(--apple-surface-secondary)",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <div style={{ display: "flex", gap: "0.45rem" }}>
              <input
                type="text"
                placeholder="Nombre del producto (ej. Plátanos)..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                autoFocus
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
        )}
      </div>

      {/* ── Carrusel de Básicos Habituales a 1 Toque (Colapsable con Chevron) ── */}
      <div style={{ marginBottom: "0.85rem" }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowStaples(!showStaples)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowStaples(!showStaples);
            }
          }}
          aria-expanded={showStaples}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.65rem 0.95rem",
            borderRadius: "var(--radius-md)",
            background: "var(--apple-surface-secondary)",
            border: "1px solid var(--apple-border)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <span style={{ fontSize: "1rem" }}>⭐</span>
            <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--apple-text)" }}>
              Básicos Habituales
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                fontWeight: 600,
              }}
            >
              {staples.length}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {showStaples && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsManagingStaples(!isManagingStaples);
                }}
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
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--apple-text-secondary)",
              }}
            >
              {showStaples ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            </div>
          </div>
        </div>

        {/* Panel de Gestión de Básicos o Carrusel (desplegable) */}
        {showStaples && (
          <div style={{ marginTop: "0.5rem" }}>
            {isManagingStaples ? (
              <div
                style={{
                  padding: "0.75rem",
                  background: "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--apple-border)",
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
        )}
      </div>

      {/* ── Filtros por Supermercado (Colapsable / Compacto con Chevron) ── */}
      <div style={{ marginBottom: "0.85rem" }}>
        <button
          type="button"
          onClick={() => setShowStoreFilters(!showStoreFilters)}
          aria-expanded={showStoreFilters}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.65rem 0.95rem",
            borderRadius: "var(--radius-md)",
            background: "var(--apple-surface-secondary)",
            border: "1px solid var(--apple-border)",
            color: "var(--apple-text)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <span style={{ fontSize: "1rem" }}>🏷️</span>
            <span style={{ fontSize: "0.86rem", fontWeight: 700 }}>
              Tiendas & Filtros
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "0.15rem 0.55rem",
                borderRadius: "var(--radius-full)",
                background:
                  selectedStore === "all"
                    ? "var(--apple-surface)"
                    : `${storeMap.get(selectedStore as number)?.color}22`,
                color:
                  selectedStore === "all"
                    ? "var(--apple-text-secondary)"
                    : storeMap.get(selectedStore as number)?.color,
                fontWeight: 600,
                border: "1px solid var(--apple-border)",
              }}
            >
              {selectedStore === "all" ? "Todos los súper" : storeMap.get(selectedStore as number)?.name}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: "var(--apple-text-secondary)",
            }}
          >
            {showStoreFilters ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </div>
        </button>

        {showStoreFilters && (
          <div
            style={{
              marginTop: "0.5rem",
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
        )}
      </div>
      </div> {/* Fin de Tarjeta 1: Herramientas y Gestión */}

      {/* ══════════════════════════════════════════════════════════════════════
          TARJETA 2: LISTA DE LA COMPRA (Separada, Destacada y Ergonómica Mobile)
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="liquid-glass liquid-specular"
        style={{
          padding: "1.25rem 1.05rem",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--liquid-shadow-ambient)",
        }}
      >
        {/* Cabecera de la Tarjeta Lista de la Compra */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.85rem",
            flexWrap: "wrap",
            gap: "0.6rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              className="squircle-icon"
              style={{
                background: "var(--apple-green-subtle)",
                color: "var(--apple-green)",
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.35rem",
              }}
            >
              🛒
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "var(--apple-text)" }}>
                  Lista de la compra
                </h2>
                <span
                  style={{
                    fontSize: "0.74rem",
                    padding: "0.18rem 0.6rem",
                    borderRadius: "var(--radius-full)",
                    background: filteredPendingItems.length > 0 ? "var(--apple-green-subtle)" : "rgba(255, 255, 255, 0.08)",
                    color: filteredPendingItems.length > 0 ? "var(--apple-green)" : "var(--apple-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  {filteredPendingItems.length} {filteredPendingItems.length === 1 ? "pendiente" : "pendientes"}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.12rem" }}>
                {selectedStore === "all"
                  ? "Todos los supermercados · Pulsa 🛒 a la derecha para meter al carro"
                  : `Filtrado por: ${storeMap.get(selectedStore as number)?.name || "Tienda"}`}
              </p>
            </div>
          </div>

          {/* Botón para colapsar/expandir si el usuario lo desea */}
          <button
            type="button"
            onClick={() => setShowPendingList(!showPendingList)}
            className="btn-ghost touch-target"
            style={{
              fontSize: "0.78rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "var(--radius-full)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--apple-text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span>{showPendingList ? "Plegar" : "Desplegar"}</span>
            {showPendingList ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </button>
        </div>

        {/* ── Barra de Progreso del Carrito en Vivo ── */}
        {pendingCount > 0 && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 0.85rem",
              marginBottom: "1rem",
              border: "1px solid var(--apple-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: "0.35rem" }}>
              <span style={{ color: "var(--apple-text-secondary)" }}>
                🛒 En el carro físico: <b>{inCartCount}</b> de {pendingCount}
              </span>
              <span style={{ fontWeight: 700, color: inCartCount > 0 ? "var(--apple-green)" : "var(--apple-text-secondary)" }}>
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

        {/* Listado de Productos Pendientes */}
        {showPendingList && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {filteredPendingItems.length === 0 ? (
              <div
                style={{
                  padding: "2rem 1rem",
                  textAlign: "center",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px dashed var(--apple-border)",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>🎉</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  {selectedStore === "all" ? "¡No hay nada pendiente para comprar!" : "No hay pendientes en esta tienda"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
                  Añade productos desde las herramientas superiores o con Pepe en Telegram.
                </div>
              </div>
            ) : (
              filteredPendingItems.map(renderItemCard)
            )}
          </div>
        )}

        {/* ── Sección de Productos Comprados (Colapsable y Limpiable al pie) ── */}
        {checkedCount > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--apple-border)",
              paddingTop: "0.9rem",
              marginTop: "1.1rem",
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
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.55rem" }}>
                {checkedItems.map(renderItemCard)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Unificado de Gestión de Ticket (Cámara & Acciones) ── */}
      <TicketManagerModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />

      {/* ── Modal de Gasto Manual ── */}
      <ManualExpenseModal
        isOpen={isManualExpenseOpen}
        onClose={() => setIsManualExpenseOpen(false)}
      />
    </div>
  );
}
