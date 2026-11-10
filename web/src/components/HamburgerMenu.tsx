"use client";

import { useState, useRef, useEffect } from "react";

export type NavItem = {
  id: string;
  label: string;
  icon: (size?: number) => React.ReactNode;
};

export function HamburgerMenu({
  items,
  activeIndex,
  onSelectIndex,
  onTriggerScreensaver,
  lowStockCount = 0,
  pendingTasksCount = 0,
}: {
  items: readonly NavItem[];
  activeIndex: number;
  onSelectIndex: (idx: number) => void;
  onTriggerScreensaver?: () => void;
  lowStockCount?: number;
  pendingTasksCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera o pulsar Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentItem = items[activeIndex] || items[0];

  return (
    <div ref={menuRef} style={{ position: "relative", zIndex: 100 }}>
      {/* Botón Desplegable Hamburguesa Liquid Glass */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="liquid-pill liquid-specular touch-target"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.55rem",
          padding: "0.45rem 1rem",
          borderRadius: "var(--radius-full)",
          background: isOpen ? "var(--apple-surface-elevated)" : "var(--liquid-glass-bg)",
          border: "1px solid var(--apple-border-strong)",
          color: "var(--apple-text)",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.9rem",
          boxShadow: isOpen ? "var(--liquid-shadow-elevated)" : "var(--liquid-shadow-dock)",
          transition: "all 0.2s var(--ease-spring)",
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Menú principal de secciones"
      >
        {/* Icono Hamburguesa animado */}
        <div
          style={{
            width: "18px",
            height: "14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              height: "2px",
              width: "100%",
              background: "var(--apple-text)",
              borderRadius: "2px",
              transition: "transform 0.2s ease",
              transform: isOpen ? "rotate(45deg) translate(4px, 4px)" : "none",
            }}
          />
          <span
            style={{
              height: "2px",
              width: "100%",
              background: "var(--apple-text)",
              borderRadius: "2px",
              opacity: isOpen ? 0 : 1,
              transition: "opacity 0.2s ease",
            }}
          />
          <span
            style={{
              height: "2px",
              width: "100%",
              background: "var(--apple-text)",
              borderRadius: "2px",
              transition: "transform 0.2s ease",
              transform: isOpen ? "rotate(-45deg) translate(4px, -5px)" : "none",
            }}
          />
        </div>

        {/* Sección Activa */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <span>{currentItem?.label || "Menú"}</span>
          <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>▼</span>
        </span>

        {/* Badges si hay alertas pendientes */}
        {(lowStockCount > 0 || pendingTasksCount > 0) && (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: lowStockCount > 0 ? "var(--apple-orange)" : "var(--apple-blue)",
              boxShadow: `0 0 6px ${lowStockCount > 0 ? "var(--apple-orange)" : "var(--apple-blue)"}`,
            }}
          />
        )}
      </button>

      {/* Desplegable Flotante */}
      {isOpen && (
        <div
          className="liquid-glass liquid-specular"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: "240px",
            padding: "0.5rem",
            borderRadius: "var(--radius-xl)",
            background: "var(--apple-surface-elevated)",
            backdropFilter: "var(--liquid-blur-heavy)",
            WebkitBackdropFilter: "var(--liquid-blur-heavy)",
            border: "1px solid var(--apple-border-strong)",
            boxShadow: "var(--liquid-shadow-elevated), 0 20px 40px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            animation: "slideDownMenu 0.22s var(--ease-spring) forwards",
          }}
        >
          <div
            style={{
              padding: "0.4rem 0.65rem 0.3rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--apple-text-tertiary)",
            }}
          >
            Secciones del Hogar
          </div>

          {items.map((item, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectIndex(idx);
                  setIsOpen(false);
                }}
                className="touch-target"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: isActive ? "var(--apple-blue-subtle)" : "transparent",
                  border: "none",
                  color: isActive ? "var(--apple-blue)" : "var(--apple-text)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div style={{ width: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon(18)}
                  </div>
                  <span>{item.label}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {item.id === "compra" && lowStockCount > 0 && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "0.1rem 0.4rem",
                        borderRadius: "var(--radius-full)",
                        background: "var(--apple-orange)",
                        color: "#fff",
                      }}
                    >
                      {lowStockCount}
                    </span>
                  )}
                  {item.id === "familia" && pendingTasksCount > 0 && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "0.1rem 0.4rem",
                        borderRadius: "var(--radius-full)",
                        background: "rgba(255,255,255,0.2)",
                        color: "var(--apple-text)",
                      }}
                    >
                      {pendingTasksCount}
                    </span>
                  )}
                  {isActive && <span style={{ fontSize: "0.85rem" }}>✓</span>}
                </div>
              </button>
            );
          })}

          {/* Opción directa para Modo Marco / Fondo de Pantalla */}
          {onTriggerScreensaver && (
            <>
              <div style={{ height: "1px", background: "var(--apple-border)", margin: "0.35rem 0" }} />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onTriggerScreensaver();
                }}
                className="touch-target"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: "transparent",
                  border: "none",
                  color: "var(--apple-text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>🖼️</span>
                <span>Modo Fondo de Pantalla</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

