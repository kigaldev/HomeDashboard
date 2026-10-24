"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import {
  updateMemberAction,
  updateSettingAction,
  getGcalUrlsAction,
  verifyGoogleCalendarAction,
  verifyTelegramIntegrationAction,
  syncGoogleCalendarAction,
} from "@/app/actions";
import type { Member } from "@/lib/repo";

export function SettingsModal({
  isOpen,
  onClose,
  members = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member>(members[0]);
  const [name, setName] = useState(selectedMember?.name || "");
  const [emoji, setEmoji] = useState(selectedMember?.emoji || "🙂");
  const [color, setColor] = useState(selectedMember?.color || "#0071e3");
  const [birthdate, setBirthdate] = useState(selectedMember?.birthdate || "");
  const [telegramUserId, setTelegramUserId] = useState(selectedMember?.telegram_user_id || "");
  const [allergies, setAllergies] = useState(selectedMember?.allergies || "");
  const [isPending, startTransition] = useTransition();

  // Calendarios de Google (iCal)
  const [gcalKike, setGcalKike] = useState("");
  const [gcalLara, setGcalLara] = useState("");
  const [gcalKikeChecking, setGcalKikeChecking] = useState(false);
  const [gcalLaraChecking, setGcalLaraChecking] = useState(false);
  const [gcalKikeResult, setGcalKikeResult] = useState<{ ok: boolean; message: string; count?: number } | null>(null);
  const [gcalLaraResult, setGcalLaraResult] = useState<{ ok: boolean; message: string; count?: number } | null>(null);

  // Verificación Telegram
  const [telegramChecking, setTelegramChecking] = useState(false);
  const [telegramResult, setTelegramResult] = useState<{
    ok: boolean;
    status?: string;
    botUsername?: string;
    botName?: string;
    message: string;
  } | null>(null);

  // Sincronizar datos al cambiar de miembro seleccionado
  useEffect(() => {
    if (selectedMember) {
      setName(selectedMember.name);
      setEmoji(selectedMember.emoji);
      setColor(selectedMember.color);
      setBirthdate(selectedMember.birthdate || "");
      setTelegramUserId(selectedMember.telegram_user_id || "");
      setAllergies(selectedMember.allergies || "");
      setTelegramResult(null);
    }
  }, [selectedMember]);

  // Cargar URLs de Google Calendar cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      getGcalUrlsAction()
        .then(({ urlKike, urlLara }) => {
          setGcalKike(urlKike || "");
          setGcalLara(urlLara || "");
        })
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [onClose]);

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("id", String(selectedMember.id));
    fd.append("name", name);
    fd.append("emoji", emoji);
    fd.append("color", color);
    if (birthdate) fd.append("birthdate", birthdate);
    if (telegramUserId) fd.append("telegramUserId", telegramUserId);
    if (allergies) fd.append("allergies", allergies);

    startTransition(async () => {
      await updateMemberAction(fd);
      onClose();
    });
  };

  const handleVerifyTelegram = async () => {
    setTelegramChecking(true);
    try {
      const res = await verifyTelegramIntegrationAction(telegramUserId);
      setTelegramResult(res);
    } catch (err: unknown) {
      setTelegramResult({
        ok: false,
        message: `Error inesperado: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setTelegramChecking(false);
    }
  };

  const handleVerifyGcal = async (member: "kike" | "lara") => {
    if (member === "kike") {
      setGcalKikeChecking(true);
      try {
        const res = await verifyGoogleCalendarAction("kike", gcalKike);
        setGcalKikeResult(res);
      } catch (err: unknown) {
        setGcalKikeResult({
          ok: false,
          message: `Error al conectar: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setGcalKikeChecking(false);
      }
    } else {
      setGcalLaraChecking(true);
      try {
        const res = await verifyGoogleCalendarAction("lara", gcalLara);
        setGcalLaraResult(res);
      } catch (err: unknown) {
        setGcalLaraResult({
          ok: false,
          message: `Error al conectar: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setGcalLaraChecking(false);
      }
    }
  };

  const handleSaveAllCalendars = async () => {
    if (gcalKike) await updateSettingAction("gcal_url_kike", gcalKike);
    if (gcalLara) await updateSettingAction("gcal_url_lara", gcalLara);
    await syncGoogleCalendarAction();
    await handleVerifyGcal("kike");
    if (gcalLara) await handleVerifyGcal("lara");
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="settings-title"
      style={{
        maxWidth: "580px",
        maxHeight: "90vh",
        display: isOpen ? "flex" : "none",
        flexDirection: "column",
        overflowY: "auto",
        border: "1px solid var(--apple-border)",
        borderRadius: "var(--radius-xl)",
      }}
    >
      {/* Tirador táctil iOS para móvil */}
      <div className="sheet-handle" />

      {/* Header Apple Style */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.2rem",
          borderBottom: "1px solid var(--apple-border)",
          paddingBottom: "0.85rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-surface-secondary)",
              color: "var(--apple-text)",
            }}
          >
            ⚙️
          </div>
          <div>
            <h2 id="settings-title" style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Ajustes del Hogar
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Miembros familiares · Integraciones & Calendarios
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ width: "32px", height: "32px", borderRadius: "50%", padding: 0, justifyContent: "center" }}
        >
          ✕
        </button>
      </div>

      {/* Selector de miembro estilo Apple Segments */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)", display: "block", marginBottom: "0.5rem" }}>
          Editar Perfil Familiar:
        </label>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m)}
              className={`tab-btn ${selectedMember?.id === m.id ? "active" : ""}`}
              style={{ fontSize: "0.82rem", padding: "0.35rem 0.85rem" }}
            >
              <span>{m.emoji}</span> <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Formulario estilo iOS Form Group */}
      <form onSubmit={handleSaveMember} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: "0.5rem" }}>
          <div>
            <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field"
              style={{ marginTop: "0.25rem" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="input-field"
              style={{ marginTop: "0.25rem", textAlign: "center" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="input-field"
              style={{ padding: "0.2rem", height: "42px", marginTop: "0.25rem", cursor: "pointer" }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>Fecha de nacimiento</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="input-field"
            style={{ marginTop: "0.25rem" }}
          />
        </div>

        {/* Sección Telegram con verificación */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
              ID de usuario de Telegram
            </label>
            <button
              type="button"
              onClick={handleVerifyTelegram}
              disabled={telegramChecking}
              className="btn-ghost"
              style={{
                fontSize: "0.72rem",
                padding: "0.2rem 0.55rem",
                color: "var(--apple-blue)",
                fontWeight: 600,
                borderRadius: "var(--radius-sm)",
                background: "rgba(0, 113, 227, 0.08)",
              }}
            >
              {telegramChecking ? "⏳ Comprobando..." : "🔍 Verificar Bot & Acceso"}
            </button>
          </div>
          <input
            type="text"
            placeholder="Ej. 6684237859"
            value={telegramUserId}
            onChange={(e) => setTelegramUserId(e.target.value)}
            className="input-field"
          />

          {telegramResult && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.75rem",
                lineHeight: 1.45,
                background:
                  telegramResult.status === "active"
                    ? "rgba(48, 209, 88, 0.12)"
                    : telegramResult.status === "pending_start"
                    ? "rgba(255, 159, 10, 0.12)"
                    : "rgba(255, 69, 58, 0.12)",
                border: `1px solid ${
                  telegramResult.status === "active"
                    ? "rgba(48, 209, 88, 0.3)"
                    : telegramResult.status === "pending_start"
                    ? "rgba(255, 159, 10, 0.3)"
                    : "rgba(255, 69, 58, 0.3)"
                }`,
                color: "var(--apple-text)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.95rem" }}>
                {telegramResult.status === "active" ? "✅" : telegramResult.status === "pending_start" ? "⚡" : "❌"}
              </span>
              <div style={{ flex: 1 }}>
                <div>{telegramResult.message}</div>
                {telegramResult.botUsername && (
                  <div style={{ marginTop: "0.35rem" }}>
                    <a
                      href={`https://t.me/${telegramResult.botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--apple-blue)",
                        fontWeight: 600,
                        textDecoration: "underline",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      Abrir @{telegramResult.botUsername} en Telegram ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
            Alergias o intolerancias alimentarias
          </label>
          <input
            type="text"
            placeholder="Ej. Frutos secos, lactosa (se tienen en cuenta para las cenas)"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className="input-field"
            style={{ marginTop: "0.25rem" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: "0.55rem 1.1rem" }}>
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.55rem 1.25rem" }}>
            Guardar cambios del perfil
          </button>
        </div>
      </form>

      {/* Sincronización Google Calendar */}
      <div
        style={{
          marginTop: "1.25rem",
          padding: "1.1rem",
          background: "var(--apple-surface-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--apple-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
          <h3 style={{ fontSize: "0.88rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span>📅</span> <span>Google Calendar (Kike & Lara)</span>
          </h3>
        </div>
        <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginBottom: "0.85rem", lineHeight: 1.45 }}>
          En Google Calendar: <em>Configuración</em> → <em>Integrar</em> → Copia la <strong>Dirección secreta en formato iCal</strong> (.ics) y pégala aquí:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Calendario Kike */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text)" }}>
                👨 Calendario de Kike
              </label>
              <button
                type="button"
                onClick={() => handleVerifyGcal("kike")}
                disabled={gcalKikeChecking}
                className="btn-ghost"
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.5rem",
                  color: "var(--apple-blue)",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(0, 113, 227, 0.08)",
                }}
              >
                {gcalKikeChecking ? "⏳ Verificando..." : "🔍 Verificar Feed iCal"}
              </button>
            </div>
            <input
              type="url"
              placeholder="URL iCal secreta Google Calendar (Kike)..."
              value={gcalKike}
              onChange={(e) => setGcalKike(e.target.value)}
              className="input-field"
              style={{ fontSize: "0.82rem" }}
            />
            {gcalKikeResult && (
              <div
                style={{
                  marginTop: "0.35rem",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.74rem",
                  background: gcalKikeResult.ok ? "rgba(48, 209, 88, 0.12)" : "rgba(255, 69, 58, 0.12)",
                  border: `1px solid ${gcalKikeResult.ok ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 69, 58, 0.3)"}`,
                  color: "var(--apple-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>{gcalKikeResult.ok ? "✅" : "❌"}</span>
                <span>{gcalKikeResult.message}</span>
              </div>
            )}
          </div>

          {/* Calendario Lara */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text)" }}>
                👩 Calendario de Lara
              </label>
              <button
                type="button"
                onClick={() => handleVerifyGcal("lara")}
                disabled={gcalLaraChecking}
                className="btn-ghost"
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.5rem",
                  color: "var(--apple-blue)",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(0, 113, 227, 0.08)",
                }}
              >
                {gcalLaraChecking ? "⏳ Verificando..." : "🔍 Verificar Feed iCal"}
              </button>
            </div>
            <input
              type="url"
              placeholder="URL iCal secreta Google Calendar (Lara)..."
              value={gcalLara}
              onChange={(e) => setGcalLara(e.target.value)}
              className="input-field"
              style={{ fontSize: "0.82rem" }}
            />
            {gcalLaraResult && (
              <div
                style={{
                  marginTop: "0.35rem",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.74rem",
                  background: gcalLaraResult.ok ? "rgba(48, 209, 88, 0.12)" : "rgba(255, 69, 58, 0.12)",
                  border: `1px solid ${gcalLaraResult.ok ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 69, 58, 0.3)"}`,
                  color: "var(--apple-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>{gcalLaraResult.ok ? "✅" : "❌"}</span>
                <span>{gcalLaraResult.message}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveAllCalendars}
            className="btn-secondary"
            style={{ alignSelf: "flex-start", fontSize: "0.8rem", padding: "0.5rem 1rem", marginTop: "0.25rem" }}
          >
            Guardar y Sincronizar Calendarios
          </button>
        </div>
      </div>
    </dialog>
  );
}
