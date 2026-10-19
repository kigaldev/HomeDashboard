"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { updateMemberAction } from "@/app/actions";
import type { Member } from "@/lib/repo";

export function SettingsModal({
  isOpen,
  onClose,
  members,
}: {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member>(members[0]);
  const [name, setName] = useState(selectedMember?.name || "");
  const [emoji, setEmoji] = useState(selectedMember?.emoji || "🙂");
  const [color, setColor] = useState(selectedMember?.color || "#7c9cff");
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

  // Fallback light-dismiss for Safari / browsers without closedby="any"
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
        maxWidth: "560px",
        maxHeight: "90vh",
        display: isOpen ? "flex" : "none",
        flexDirection: "column",
        padding: "1.25rem",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        <h2 id="settings-title" style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span>⚙️</span>
          <span>Ajustes del Hogar</span>
        </h2>
        <button onClick={onClose} className="btn-ghost" style={{ fontSize: "1.1rem", padding: "0.2rem 0.5rem" }}>
          ✕
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
          Selecciona miembro de la familia a editar:
        </label>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m)}
              className={`tab-btn ${selectedMember.id === m.id ? "active" : ""}`}
              style={{ fontSize: "0.82rem", padding: "0.3rem 0.75rem" }}
            >
              <span>{m.emoji}</span> <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSaveMember} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: "0.5rem" }}>
          <div>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field"
              style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="input-field"
              style={{ fontSize: "0.85rem", marginTop: "0.2rem", textAlign: "center" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="input-field"
              style={{ padding: "0.2rem", height: "38px", marginTop: "0.2rem", cursor: "pointer" }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Fecha de nacimiento</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="input-field"
            style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            ID de usuario de Telegram (para autorizar comandos al bot)
          </label>
          <input
            type="text"
            placeholder="Ej. 123456789"
            value={telegramUserId}
            onChange={(e) => setTelegramUserId(e.target.value)}
            className="input-field"
            style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Alergias o intolerancias alimentarias
          </label>
          <input
            type="text"
            placeholder="Ej. Frutos secos, lactosa (se tienen en cuenta para las cenas)"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className="input-field"
            style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.5rem 1.2rem", fontSize: "0.85rem" }}>
            Guardar cambios
          </button>
        </div>
      </form>

      {/* Sincronización Google Calendar */}
      <div style={{ marginTop: "1.25rem", padding: "0.85rem", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span>📅</span> <span>Sincronizar Google Calendar (Kike &amp; Lara)</span>
        </h3>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.6rem", lineHeight: 1.4 }}>
          En Google Calendar: <em>Configuración de tu calendario</em> → <em>Integrar el calendario</em> → Copia la <strong>Dirección secreta en formato iCal</strong> y pégala aquí:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <input
            type="url"
            placeholder="URL iCal secreta Google Calendar (Kike)..."
            id="gcal-kike"
            className="input-field"
            style={{ fontSize: "0.78rem" }}
          />
          <input
            type="url"
            placeholder="URL iCal secreta Google Calendar (Lara)..."
            id="gcal-lara"
            className="input-field"
            style={{ fontSize: "0.78rem" }}
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
            style={{ alignSelf: "flex-start", fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
          >
            Guardar y Sincronizar Google Calendar
          </button>
        </div>
      </div>

      {/* Info de configuración y Tailscale */}
      <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
        <p><strong>🌐 Acceso desde el móvil fuera de casa:</strong> Instala <em>Tailscale</em> en el PC servidor y en vuestros iPhones/Android. Podréis entrar de forma 100% segura y encriptada sin abrir puertos en el router.</p>
        <p style={{ marginTop: "0.3rem" }}><strong>🤖 Bot de Telegram:</strong> Abre Telegram, habla con @BotFather, crea tu bot y pon el token en <code>.env</code>. Para ver tu ID de Telegram, manda un mensaje a tu bot y escribe <code>/start</code>.</p>
      </div>
    </dialog>
  );
}
