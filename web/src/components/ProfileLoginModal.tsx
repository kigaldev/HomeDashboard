"use client";

import { useState, useTransition } from "react";
import type { Member } from "@/lib/repo";
import {
  setActiveProfileCookieAction,
  clearActiveProfileCookieAction,
  updateProfilePreferenceAction,
  setProfilePinAction,
  verifyProfilePinAction,
} from "@/app/actions";

export function ProfileLoginModal({
  isOpen,
  onClose,
  members,
  currentMemberId,
}: {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentMemberId: number | null;
}) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("resumen");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const adults = members.filter((m) => m.role === "adult");
  const activeMember = members.find((m) => m.id === currentMemberId);

  const handleSelectAdult = (member: Member) => {
    setSelectedMember(member);
    setPinInput("");
    setPinError(null);
    setShowPinSetup(false);
    setSelectedTab(member.preferred_tab || "resumen");

    // Si no tiene PIN configurado, acceso inmediato
    if (!member.pin) {
      startTransition(async () => {
        await setActiveProfileCookieAction(member.id);
        onClose();
      });
    }
  };

  const handleVerifyPin = () => {
    if (!selectedMember) return;
    if (pinInput.length !== 4) {
      setPinError("El PIN debe tener 4 dígitos");
      return;
    }

    startTransition(async () => {
      const ok = await verifyProfilePinAction(selectedMember.id, pinInput);
      if (ok) {
        await setActiveProfileCookieAction(selectedMember.id);
        onClose();
      } else {
        setPinError("PIN incorrecto. Inténtalo de nuevo.");
      }
    });
  };

  const handleSavePinSetup = () => {
    if (!selectedMember) return;
    if (newPinInput.length !== 4 && newPinInput.length !== 0) {
      setPinError("El PIN debe ser de 4 dígitos o dejarlo vacío para quitarlo.");
      return;
    }

    startTransition(async () => {
      await setProfilePinAction(selectedMember.id, newPinInput);
      setShowPinSetup(false);
      setNewPinInput("");
      setPinError(null);
    });
  };

  const handleSavePreference = (tab: string) => {
    setSelectedTab(tab);
    if (!selectedMember) return;
    startTransition(async () => {
      await updateProfilePreferenceAction(selectedMember.id, tab);
    });
  };

  const handleClearSession = () => {
    startTransition(async () => {
      await clearActiveProfileCookieAction();
      onClose();
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--apple-surface-elevated, #1c1c1e)",
          border: "1px solid var(--apple-border, rgba(255, 255, 255, 0.14))",
          borderRadius: "var(--radius-xl, 24px)",
          width: "100%",
          maxWidth: "460px",
          padding: "1.75rem",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.3rem" }}>👤</span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                Perfil del Hogar
              </h2>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.25rem" }}>
              {activeMember
                ? `Sesión activa como ${activeMember.name} ${activeMember.emoji}`
                : "Selecciona quién está usando el dashboard"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ fontSize: "1.1rem", padding: "0.2rem 0.5rem", borderRadius: "50%" }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Si estamos en pantalla de verificación de PIN */}
        {selectedMember && selectedMember.pin && !showPinSetup ? (
          <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: `${selectedMember.color}22`,
                border: `3px solid ${selectedMember.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.2rem",
                margin: "0 auto 0.75rem auto",
              }}
            >
              {selectedMember.emoji}
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0, marginBottom: "0.3rem" }}>
              Hola, {selectedMember.name}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--apple-text-secondary)", margin: 0, marginBottom: "1.1rem" }}>
              Introduce tu PIN de 4 dígitos para acceder
            </p>

            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus
              className="input-field"
              style={{
                fontSize: "1.8rem",
                letterSpacing: "0.5rem",
                textAlign: "center",
                width: "160px",
                margin: "0 auto 1rem auto",
                display: "block",
              }}
            />

            {pinError && (
              <p style={{ fontSize: "0.8rem", color: "var(--apple-red)", marginBottom: "0.85rem" }}>
                {pinError}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="btn-secondary"
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleVerifyPin}
                disabled={isPending || pinInput.length !== 4}
                className="btn-primary"
                style={{
                  fontSize: "0.85rem",
                  padding: "0.5rem 1.25rem",
                  background: selectedMember.color,
                }}
              >
                Entrar
              </button>
            </div>
          </div>
        ) : (
          /* Lista de selección de adultos: Kike y Lara */
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "1.25rem" }}>
              {adults.map((adult) => {
                const isActive = adult.id === currentMemberId;
                return (
                  <div
                    key={adult.id}
                    onClick={() => handleSelectAdult(adult)}
                    style={{
                      padding: "1.1rem",
                      borderRadius: "var(--radius-lg, 18px)",
                      background: isActive ? `${adult.color}18` : "var(--apple-surface-secondary, rgba(255, 255, 255, 0.05))",
                      border: `2px solid ${isActive ? adult.color : "var(--apple-border)"}`,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.18s ease",
                      position: "relative",
                    }}
                  >
                    {isActive && (
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          background: adult.color,
                          color: "#fff",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "var(--radius-full)",
                        }}
                      >
                        ACTIVO
                      </span>
                    )}

                    <div
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius: "50%",
                        background: `${adult.color}22`,
                        border: `2px solid ${adult.color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.8rem",
                        margin: "0 auto 0.65rem auto",
                        boxShadow: isActive ? `0 0 16px ${adult.color}44` : "none",
                      }}
                    >
                      {adult.emoji}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--apple-text)" }}>
                      {adult.name}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--apple-text-secondary)", marginTop: "0.15rem" }}>
                      {adult.name === "Kike" ? "Papá" : "Mamá"}
                    </div>

                    {adult.pin && (
                      <div style={{ fontSize: "0.68rem", color: "var(--apple-text-tertiary)", marginTop: "0.35rem" }}>
                        🔒 Con PIN
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Opciones de personalización para el usuario activo */}
            {activeMember && (
              <div
                style={{
                  padding: "0.95rem",
                  background: "var(--apple-surface-secondary, rgba(255, 255, 255, 0.04))",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--apple-border)",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--apple-text-secondary)", marginBottom: "0.55rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Ajustes para {activeMember.name}
                </div>

                {/* Pestaña de inicio favorita */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--apple-text)" }}>Pestaña favorita al abrir:</span>
                  <select
                    value={activeMember.preferred_tab || selectedTab}
                    onChange={(e) => handleSavePreference(e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.78rem", padding: "0.25rem 0.6rem", width: "125px", cursor: "pointer" }}
                  >
                    <option value="resumen">Resumen</option>
                    <option value="compra">Compra</option>
                    <option value="tickets">Tickets</option>
                    <option value="tareas">Tareas</option>
                    <option value="peques">Peques</option>
                    <option value="agenda">Agenda</option>
                  </select>
                </div>

                {/* Configurar PIN */}
                {!showPinSetup ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(activeMember);
                      setShowPinSetup(true);
                      setNewPinInput("");
                      setPinError(null);
                    }}
                    className="btn-ghost"
                    style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", color: "var(--apple-blue)", display: "block", textAlign: "left" }}
                  >
                    🔒 {activeMember.pin ? "Cambiar código PIN de 4 dígitos" : "Añadir código PIN de 4 dígitos"}
                  </button>
                ) : (
                  <div style={{ marginTop: "0.5rem", padding: "0.65rem", background: "rgba(0,0,0,0.25)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.78rem", marginBottom: "0.35rem" }}>
                      Nuevo PIN de 4 dígitos (vacío para desactivar):
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="4 dígitos"
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ""))}
                        className="input-field"
                        style={{ width: "95px", textAlign: "center", fontSize: "0.95rem" }}
                      />
                      <button
                        type="button"
                        onClick={handleSavePinSetup}
                        className="btn-primary"
                        style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPinSetup(false)}
                        className="btn-ghost"
                        style={{ fontSize: "0.78rem" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Acciones inferiores */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {currentMemberId ? (
                <button
                  type="button"
                  onClick={handleClearSession}
                  className="btn-ghost"
                  style={{ fontSize: "0.78rem", color: "var(--apple-red)" }}
                >
                  Cerrar perfil (Modo Familiar)
                </button>
              ) : (
                <span style={{ fontSize: "0.74rem", color: "var(--apple-text-tertiary)" }}>
                  Modo compartido familiar activo
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
