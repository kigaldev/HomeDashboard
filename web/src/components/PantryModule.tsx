"use client";

import { useState, useTransition, useMemo } from "react";
import {
  setPantryStatusAction,
  setPantryStockLevelAction,
  addPantryItemAction,
  deletePantryItemAction,
} from "@/app/actions";
import type { PantryItem } from "@/lib/repo";
import {
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconCheck,
  IconCart,
} from "./Icons";

function getPantryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("leche")) return "🥛";
  if (n.includes("huevo")) return "🥚";
  if (n.includes("aceite")) return "🫒";
  if (n.includes("café") || n.includes("cafe")) return "☕";
  if (n.includes("arroz")) return "🍚";
  if (n.includes("pasta") || n.includes("macarron") || n.includes("espaguet")) return "🍝";
  if (n.includes("pan") || n.includes("tostad")) return "🥖";
  if (n.includes("pañal")) return "🧷";
  if (n.includes("toallit")) return "🧻";
  if (n.includes("detergente") || n.includes("suavizante") || n.includes("lavavajill")) return "🫧";
  if (n.includes("higiénico") || n.includes("higienico") || n.includes("papel")) return "🧻";
  if (n.includes("agua")) return "💧";
  if (n.includes("fruta") || n.includes("manzana") || n.includes("platano") || n.includes("naranja")) return "🍎";
  if (n.includes("verdura") || n.includes("tomate") || n.includes("cebolla") || n.includes("lechuga")) return "🥦";
  if (n.includes("pescado") || n.includes("atun") || n.includes("salmon") || n.includes("merluza")) return "🐟";
  if (n.includes("carne") || n.includes("pollo") || n.includes("ternera") || n.includes("cerdo")) return "🥩";
  if (n.includes("yogur") || n.includes("queso")) return "🧀";
  if (n.includes("galleta") || n.includes("cereal") || n.includes("chocolate")) return "🍪";
  if (n.includes("legumbre") || n.includes("lenteja") || n.includes("garbanzo")) return "🫘";
  return "🥫";
}

function getStockColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  // Hue de 0° (Rojo puro) a 125° (Verde Apple)
  const hue = Math.round((clamped / 100) * 125);
  return `hsl(${hue}, 88%, 46%)`;
}

function getStockBg(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const hue = Math.round((clamped / 100) * 125);
  return `hsla(${hue}, 88%, 46%, 0.14)`;
}

function getStockLabel(pct: number): string {
  if (pct <= 0) return "Agotado (0%)";
  if (pct <= 25) return "Crítico";
  if (pct <= 50) return "Medio";
  if (pct <= 75) return "Óptimo";
  return "Lleno (100%)";
}

export function PantryModule({
  items = [],
  initialOpen = true,
}: {
  items: PantryItem[];
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();

  // Niveles de stock optimistas en memoria para respuesta táctil y ratón instantánea (60 fps)
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [activeDragItem, setActiveDragItem] = useState<string | null>(null);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "low" | "mid" | "high">("all");

  // Formulario rápido para añadir producto
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemLevel, setNewItemLevel] = useState(100);

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
  const allPantry: (PantryItem & { quantity_level: number })[] = useMemo(() => {
    const list: (PantryItem & { quantity_level: number })[] = items.map((i) => ({
      ...i,
      quantity_level:
        i.quantity_level !== undefined && i.quantity_level !== null
          ? i.quantity_level
          : i.status === "out"
          ? 0
          : i.status === "low"
          ? 25
          : 100,
    }));

    defaultPantry
      .filter((d) => !dbNames.has(d.toLowerCase()))
      .forEach((d, idx) => {
        list.push({
          id: -1 - idx,
          name: d,
          status: "ok",
          quantity_level: 100,
        });
      });

    return list;
  }, [items]);

  const getItemLevel = (item: { name: string; quantity_level: number }) => {
    if (stockLevels[item.name] !== undefined) {
      return stockLevels[item.name];
    }
    return item.quantity_level;
  };

  const handleSliderChange = (name: string, value: number) => {
    setActiveDragItem(name);
    setStockLevels((prev) => ({ ...prev, [name]: value }));
  };

  const handleCommitStock = (name: string, value: number) => {
    setActiveDragItem(null);
    setStockLevels((prev) => ({ ...prev, [name]: value }));
    startTransition(async () => {
      await setPantryStockLevelAction(name, value);
    });
  };

  const handleQuickPreset = (name: string, value: number) => {
    setStockLevels((prev) => ({ ...prev, [name]: value }));
    startTransition(async () => {
      await setPantryStockLevelAction(name, value);
    });
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    const lvl = newItemLevel;
    setStockLevels((prev) => ({ ...prev, [name]: lvl }));
    setNewItemName("");
    setNewItemLevel(100);
    setIsAddingOpen(false);
    startTransition(async () => {
      await addPantryItemAction(name, lvl);
    });
  };

  const handleDelete = (name: string) => {
    if (!confirm(`¿Eliminar «${name}» de la despensa supervisada?`)) return;
    startTransition(async () => {
      await deletePantryItemAction(name);
    });
  };

  // Filtrado de elementos
  const filteredItems = useMemo(() => {
    return allPantry.filter((item) => {
      const lvl = getItemLevel(item);
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === "low") return lvl <= 25;
      if (filterMode === "mid") return lvl > 25 && lvl <= 75;
      if (filterMode === "high") return lvl > 75;
      return true;
    });
  }, [allPantry, stockLevels, searchQuery, filterMode]);

  const lowStockCount = allPantry.filter((i) => getItemLevel(i) <= 25).length;
  const avgStock = Math.round(
    allPantry.reduce((acc, i) => acc + getItemLevel(i), 0) / (allPantry.length || 1)
  );

  return (
    <div className="liquid-glass liquid-specular" style={{ padding: "1.25rem 1.35rem" }}>
      {/* ── Cabecera Colapsable Estilo Apple / Liquid Glass ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        aria-expanded={isOpen}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-teal-subtle)",
              color: "var(--apple-teal)",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
              boxShadow: "0 2px 8px rgba(48, 176, 199, 0.2)",
            }}
          >
            📦
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Despensa & Control de Existencias
              </h2>
              {lowStockCount > 0 ? (
                <span className="badge badge-amber" style={{ fontSize: "0.74rem", padding: "0.2rem 0.6rem" }}>
                  ⚠️ {lowStockCount} por reponer
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.74rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(52, 199, 89, 0.15)",
                    color: "var(--apple-green)",
                    fontWeight: 700,
                    border: "1px solid rgba(52, 199, 89, 0.3)",
                  }}
                >
                  ✓ Stock óptimo ({avgStock}%)
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.2rem" }}>
              {isOpen
                ? "Ajusta el nivel (0% a 100%) deslizando con el dedo o ratón. Si baja de 25% se añade automáticamente a la compra."
                : `${allPantry.length} productos supervisados · Nivel medio general: ${avgStock}% · Toca para desplegar`}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "34px",
            height: "34px",
            borderRadius: "var(--radius-full)",
            background: "var(--liquid-glass-bg-subtle, rgba(255, 255, 255, 0.05))",
            border: "1px solid var(--liquid-glass-border, rgba(255, 255, 255, 0.1))",
            color: "var(--apple-text-secondary)",
            flexShrink: 0,
            transition: "transform 0.2s ease",
          }}
        >
          {isOpen ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
        </div>
      </div>

      {/* ── Contenido Desplegable ── */}
      {isOpen && (
        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--liquid-glass-border, rgba(255, 255, 255, 0.1))" }}>
          {/* Barra de Herramientas: Búsqueda, Filtros de Nivel y Botón de Añadir */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.65rem",
              marginBottom: "1rem",
            }}
          >
            {/* Input de Búsqueda rápida */}
            <div style={{ position: "relative", minWidth: "180px", flex: "1 1 200px" }}>
              <input
                type="text"
                placeholder="🔍 Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{
                  width: "100%",
                  fontSize: "0.82rem",
                  padding: "0.45rem 0.8rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--liquid-glass-bg-subtle, rgba(255, 255, 255, 0.04))",
                  border: "1px solid var(--liquid-glass-border, rgba(255, 255, 255, 0.12))",
                }}
              />
            </div>

            {/* Chips de Filtro por Nivel de Stock */}
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`tab-btn ${filterMode === "all" ? "active" : ""}`}
                style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
              >
                Todos ({allPantry.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("low")}
                className={`tab-btn ${filterMode === "low" ? "active" : ""}`}
                style={{
                  fontSize: "0.74rem",
                  padding: "0.3rem 0.65rem",
                  color: filterMode === "low" ? "#ffffff" : "var(--apple-orange)",
                  borderColor: filterMode === "low" ? "var(--apple-orange)" : undefined,
                }}
              >
                Bajo stock ≤25% ({lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("mid")}
                className={`tab-btn ${filterMode === "mid" ? "active" : ""}`}
                style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
              >
                Medio 26-75%
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("high")}
                className={`tab-btn ${filterMode === "high" ? "active" : ""}`}
                style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
              >
                Llenos &gt;75%
              </button>
            </div>

            {/* Botón para registrar nuevo producto */}
            <button
              type="button"
              onClick={() => setIsAddingOpen(!isAddingOpen)}
              className="btn-primary"
              style={{
                fontSize: "0.78rem",
                padding: "0.4rem 0.85rem",
                gap: "0.35rem",
                borderRadius: "var(--radius-full)",
              }}
            >
              <IconPlus size={13} />
              <span>{isAddingOpen ? "Cancelar" : "Añadir a Despensa"}</span>
            </button>
          </div>

          {/* Formulario desplegable para nuevo producto */}
          {isAddingOpen && (
            <form
              onSubmit={handleAddNew}
              className="liquid-glass"
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--apple-blue)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                animation: "fadeSlideIn 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  Nuevo Producto a Supervisar
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: getStockColor(newItemLevel),
                    background: getStockBg(newItemLevel),
                    padding: "0.15rem 0.55rem",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  Nivel inicial: {newItemLevel}% ({getStockLabel(newItemLevel)})
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.6rem" }}>
                <input
                  type="text"
                  placeholder="Ej. Café en grano, Aceite de oliva, Yogures..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  autoFocus
                  className="input-field"
                  style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem", borderRadius: "var(--radius-md)" }}
                />
                <button
                  type="submit"
                  disabled={!newItemName.trim() || isPending}
                  className="btn-primary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 1rem", borderRadius: "var(--radius-md)" }}
                >
                  Guardar
                </button>
              </div>

              {/* Slider de nivel inicial */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newItemLevel}
                  onChange={(e) => setNewItemLevel(Number(e.target.value))}
                  style={{ flex: 1, accentColor: getStockColor(newItemLevel), cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>100%</span>
              </div>
            </form>
          )}

          {/* Grid de Productos con Barras de Nivel Táctiles */}
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--apple-text-secondary)",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle, rgba(255, 255, 255, 0.03))",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.88rem" }}>
                {searchQuery ? `No hay productos que coincidan con «${searchQuery}».` : "No hay productos en esta vista."}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: "0.85rem",
              }}
            >
              {filteredItems.map((item) => {
                const currentLevel = getItemLevel(item);
                const isDragging = activeDragItem === item.name;
                const stockColor = getStockColor(currentLevel);
                const stockBg = getStockBg(currentLevel);
                const emoji = getPantryEmoji(item.name);

                return (
                  <div
                    key={item.name}
                    className="liquid-glass"
                    style={{
                      padding: "0.95rem 1.05rem",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--liquid-glass-bg-subtle, rgba(255, 255, 255, 0.04))",
                      border: `1px solid ${
                        currentLevel <= 25 ? "rgba(255, 59, 48, 0.35)" : "var(--liquid-glass-border, rgba(255, 255, 255, 0.1))"
                      }`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.65rem",
                      boxShadow: currentLevel <= 25
                        ? "inset 0 1px 0 rgba(255, 59, 48, 0.2), 0 2px 10px rgba(255, 59, 48, 0.12)"
                        : "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.2)",
                      transition: "all 0.2s ease",
                      position: "relative",
                    }}
                  >
                    {/* Fila superior: Emoji + Nombre + Badge de Porcentaje con Color Dinámico */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{emoji}</span>
                        <span
                          style={{
                            fontSize: "0.92rem",
                            fontWeight: 700,
                            color: "var(--apple-text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                      </div>

                      {/* Controles de la cabecera: Badge de Stock + Botón Papelera Eliminar */}
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                        {/* Badge con indicador de color de rojo (0%) a verde (100%) */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.22rem 0.55rem",
                            borderRadius: "var(--radius-full)",
                            background: stockBg,
                            color: stockColor,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            border: `1px solid ${stockColor}40`,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: stockColor,
                              boxShadow: `0 0 6px ${stockColor}`,
                            }}
                          />
                          <span>{currentLevel}%</span>
                          <span style={{ fontSize: "0.68rem", opacity: 0.85, fontWeight: 500 }}>
                            · {getStockLabel(currentLevel)}
                          </span>
                        </div>

                        {/* Botón Papelera de eliminación */}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.name)}
                          disabled={isPending}
                          title={`Eliminar «${item.name}» de la despensa`}
                          aria-label={`Eliminar ${item.name}`}
                          className="touch-target"
                          style={{
                            background: "rgba(255, 59, 48, 0.08)",
                            border: "1px solid rgba(255, 59, 48, 0.2)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--apple-red)",
                            cursor: "pointer",
                            padding: "0.2rem 0.4rem",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(255, 59, 48, 0.22)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(255, 59, 48, 0.08)";
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* ── BARRA DE NIVEL AJUSTABLE TÁCTIL O CON RATÓN (0% - 100%) ── */}
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        userSelect: "none",
                        touchAction: "pan-y",
                      }}
                    >
                      {/* Pista de fondo translúcida estilo Liquid Glass */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "var(--radius-full)",
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                          overflow: "hidden",
                          boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.35)",
                        }}
                      >
                        {/* Relleno interactivo con degradado de color (Rojo 0% -> Amarillo 50% -> Verde 100%) */}
                        <div
                          style={{
                            height: "100%",
                            width: `${currentLevel}%`,
                            background: `linear-gradient(90deg, ${getStockColor(Math.max(0, currentLevel - 25))}, ${stockColor})`,
                            borderRadius: "var(--radius-full)",
                            boxShadow: `0 0 14px ${stockColor}66`,
                            transition: isDragging ? "none" : "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                        />
                      </div>

                      {/* Slider HTML nativo transparente superpuesto: máxima respuesta táctil y ratón */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentLevel}
                        onChange={(e) => handleSliderChange(item.name, Number(e.target.value))}
                        onPointerUp={() => handleCommitStock(item.name, currentLevel)}
                        onKeyUp={() => handleCommitStock(item.name, currentLevel)}
                        onTouchEnd={() => handleCommitStock(item.name, currentLevel)}
                        onMouseUp={() => handleCommitStock(item.name, currentLevel)}
                        aria-label={`Ajustar nivel de existencias de ${item.name}`}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          cursor: "pointer",
                          zIndex: 4,
                          margin: 0,
                        }}
                      />

                      {/* Pomo táctil visual (thumb) blanco con resplandor */}
                      <div
                        style={{
                          position: "absolute",
                          left: `calc(${currentLevel}% - 9px)`,
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          border: `2px solid ${stockColor}`,
                          boxShadow: `0 2px 8px rgba(0,0,0,0.4), 0 0 8px ${stockColor}88`,
                          pointerEvents: "none",
                          zIndex: 3,
                          transition: isDragging ? "none" : "left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </div>

                    {/* Presets rápidos de 1 toque (0% Agotado, 25% Poco, 50% Medio, 75%, 100% Lleno) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.25rem" }}>
                      {[
                        { label: "0% Vacío", level: 0 },
                        { label: "25% Poco", level: 25 },
                        { label: "50%", level: 50 },
                        { label: "75%", level: 75 },
                        { label: "100% Lleno", level: 100 },
                      ].map((p) => {
                        const isPresetActive = currentLevel === p.level;
                        const presetColor = getStockColor(p.level);
                        const presetBg = getStockBg(p.level);

                        return (
                          <button
                            key={p.level}
                            type="button"
                            onClick={() => handleQuickPreset(item.name, p.level)}
                            disabled={isPending}
                            title={`Fijar stock de ${item.name} a ${p.level}%`}
                            style={{
                              flex: 1,
                              padding: "0.24rem 0",
                              fontSize: "0.68rem",
                              fontWeight: isPresetActive ? 700 : 500,
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid",
                              borderColor: isPresetActive ? presetColor : "rgba(255, 255, 255, 0.08)",
                              background: isPresetActive ? presetBg : "rgba(255, 255, 255, 0.03)",
                              color: isPresetActive ? presetColor : "var(--apple-text-secondary)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              textAlign: "center",
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
