"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { runAgentInstructionAction } from "@/app/actions";

export function AiAssistantModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      actionExecuted?: string;
    }>
  >([
    {
      role: "assistant",
      text: "👋 ¡Hola Kike y Lara! Soy vuestro agente de acción del hogar. Puedes pedirme información o darme órdenes directas por voz o texto:\n\n• *\"Añade leche y plátanos al Mercadona\"*\n• *\"Se ha acabado el papel higiénico\"*\n• *\"Mañana Kike lleva a Fabio al cole y Lara lo recoge\"*\n• *\"Añade tarea para Kike: pedir cita pediatra el viernes\"*\n• *\"¿Qué ropa les pongo hoy a los niños con el frío de Salamanca?\"*",
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const recognitionRef = useRef<any>(null);

  // Comprobar soporte de voz Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "es-ES";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInput(transcript);
            setIsListening(false);
            // Ejecutar automáticamente al terminar de hablar
            handleSend(transcript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition error:", err);
      }
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [isOpen, isListening]);

  // Click backdrop to close
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

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isPending) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    if (!textToSend) setInput("");
    setLastAction(null);

    startTransition(async () => {
      try {
        const res = await runAgentInstructionAction(q);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: res.message,
            actionExecuted: res.actionExecuted?.description,
          },
        ]);
        if (res.actionExecuted) {
          setLastAction(res.actionExecuted.description);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "⚠️ Error al conectar con el agente del hogar." },
        ]);
      }
    });
  };

  const actionPrompts = [
    "🛒 Añadir leche y huevos a Mercadona",
    "📦 Se ha terminado el aceite en la despensa",
    "🏫 Mañana Kike lleva a Fabio y Lara lo recoge",
    "🍲 Cenamos la opción Cecotec Mambo",
    "✅ Tarea para Kike: Pedir cita pediatra para Bruno",
    "❓ ¿Qué ropa les pongo hoy a los niños?",
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="assistant-title"
      style={{
        maxWidth: "640px",
        height: "620px",
        display: isOpen ? "flex" : "none",
        flexDirection: "column",
        padding: "1.25rem",
      }}
    >
      {/* Cabecera */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.85rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.6rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🎙️</span>
          <div>
            <h2 id="assistant-title" style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              Agente de Acción del Hogar
            </h2>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Voz &amp; Texto • Modifica el dashboard en vivo
            </div>
          </div>
          <span className="badge badge-emerald" style={{ fontSize: "0.7rem", marginLeft: "0.25rem" }}>
            Interactivo
          </span>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ fontSize: "1.1rem", padding: "0.2rem 0.5rem" }}>
          ✕
        </button>
      </div>

      {/* Notificación de última acción ejecutada */}
      {lastAction && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            marginBottom: "0.5rem",
            borderRadius: "var(--radius-sm)",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid var(--accent-emerald)",
            color: "var(--accent-emerald)",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            animation: "fadeIn 0.25s ease",
          }}
        >
          <span>⚡</span>
          <span><strong>Acción ejecutada:</strong> {lastAction}</span>
        </div>
      )}

      {/* Prompts Rápidos de Acción */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
          marginBottom: "0.5rem",
          scrollbarWidth: "none",
        }}
      >
        {actionPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.slice(2).trim())}
            disabled={isPending}
            className="btn-secondary"
            style={{
              fontSize: "0.74rem",
              padding: "0.3rem 0.65rem",
              whiteSpace: "nowrap",
              borderRadius: "var(--radius-full)",
              background: "var(--bg-surface)",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Historial de Mensajes */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          paddingRight: "0.4rem",
          marginBottom: "0.85rem",
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              padding: "0.7rem 0.95rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.88rem",
              lineHeight: 1.5,
              background: m.role === "user" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "var(--bg-surface)",
              color: m.role === "user" ? "white" : "var(--text-main)",
              border: m.role === "user" ? "none" : "1px solid var(--border-subtle)",
              position: "relative",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

            {m.actionExecuted && (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.35rem 0.55rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: "var(--accent-emerald)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <span>✓</span>
                <span>{m.actionExecuted}</span>
              </div>
            )}

            {m.role === "assistant" && (
              <div style={{ marginTop: "0.4rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => speakText(m.text)}
                  className="btn-ghost"
                  title="Escuchar respuesta por altavoz"
                  style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem", color: "var(--text-muted)" }}
                >
                  🔊 Escuchar
                </button>
              </div>
            )}
          </div>
        ))}

        {isPending && (
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 0.9rem",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.84rem",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span className="pulse-indicator" style={{ background: "var(--accent-purple)" }} />
            <span>Ejecutando acción y actualizando el dashboard...</span>
          </div>
        )}
      </div>

      {/* Input con Botón de Micrófono / Voz */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}
      >
        {speechSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            disabled={isPending}
            className={isListening ? "btn-danger" : "btn-secondary"}
            title={isListening ? "Detener escucha" : "Hablar con el agente (Reconocimiento de voz)"}
            style={{
              padding: "0.55rem 0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              border: isListening ? "2px solid #ef4444" : "1px solid var(--border-subtle)",
              background: isListening ? "rgba(239, 68, 68, 0.15)" : undefined,
              animation: isListening ? "pulse 1.5s infinite" : undefined,
            }}
          >
            <span>{isListening ? "🔴" : "🎤"}</span>
            <span style={{ fontSize: "0.78rem", display: "none" }}>Voz</span>
          </button>
        )}

        <input
          type="text"
          placeholder={
            isListening
              ? "🎙️ Escuchando... Habla ahora (ej: añade leche a Mercadona)"
              : "Escribe o pulsa el micro (ej: añade pañales al Mercadona)..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          className="input-field"
          style={{
            fontSize: "0.88rem",
            flex: 1,
            borderColor: isListening ? "#ef4444" : undefined,
          }}
        />

        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="btn-primary"
          style={{ padding: "0.55rem 1.1rem", fontSize: "0.86rem" }}
        >
          Enviar
        </button>
      </form>
    </dialog>
  );
}
