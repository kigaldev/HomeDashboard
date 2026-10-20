"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { updateMemberAction } from "@/app/actions";
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

  useEffect(() => {
    if (selectedMember) {
      setName(selectedMember.name);
      setEmoji(selectedMember.emoji);
      setColor(selectedMember.color);
      setBirthdate(selectedMember.birthdate || "");
      setTelegramUserId(selectedMember.telegram_user_id || "");
      setAllergies(selectedMember.allergies || "");
    }
  }, [selectedMember]);

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
        padding: "1.5rem",
        overflowY: "auto",
        border: "1px solid var(--apple-border)",
        borderRadius: "var(--radius-xl)",
      }}
    >
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

        <div>
          <label style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
            ID de usuario de Telegram (para autorizar comandos por bot)
          </label>
          <input
            type="text"
            placeholder="Ej. 123456789"
            value={telegramUserId}
            onChange={(e) => setTelegramUserId(e.target.value)}
            className="input-field"
            style={{ marginTop: "0.25rem" }}
          />
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
            Guardar cambios
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
        <h3 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span>📅</span> <span>Google Calendar (Kike & Lara)</span>
        </h3>
        <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginBottom: "0.75rem", lineHeight: 1.45 }}>
          En Google Calendar: <em>Configuración</em> → <em>Integrar</em> → Copia la <strong>Dirección secreta en formato iCal</strong> y pégala aquí:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input
            type="url"
            placeholder="URL iCal secreta Google Calendar (Kike)..."
            id="gcal-kike"
            className="input-field"
            style={{ fontSize: "0.82rem" }}
          />
          <input
            type="url"
            placeholder="URL iCal secreta Google Calendar (Lara)..."
            id="gcal-lara"
            className="input-field"
            style={{ fontSize: "0.82rem" }}
          />
          <button
            type="button"
            onClick={async () => {
              const kike = (document.getElementById("gcal-kike") as HTMLInputElement)?.value;
              const lara = (document.getElementById("gcal-lara") as HTMLInputElement)?.value;
              const { updateSettingAction, syncGoogleCalendarAction } = await import("@/app/actions");
              if (kike) await updateSettingAction("gcal_url_kike", kike);
              if (lara) await updateSettingAction("gcal_url_lara", lara);
              await syncGoogleCalendarAction();
              alert("Calendarios guardados y sincronizados.");
            }}
            className="btn-secondary"
            style={{ alignSelf: "flex-start", fontSize: "0.8rem", padding: "0.45rem 0.95rem" }}
          >
            Guardar y Sincronizar Calendarios
          </button>
        </div>
      </div>
    </dialog>
  );
}
