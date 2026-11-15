"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { runAgentInstructionAction, processReceiptImageAction } from "@/app/actions";
import { IconSparkles, IconVolume2, IconVolumeX, IconMic, IconMicOff } from "./Icons";

export function AiAssistantModal({
  isOpen,
  onClose,
  initialPrompt = "",
  initialFile = null,
  startWithVoice = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialFile?: File | null;
  startWithVoice?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const wasVoiceInputRef = useRef(false);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInput(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    if (initialFile && isOpen) {
      handleProcessReceipt(initialFile);
    }
  }, [initialFile, isOpen]);

  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      actionExecuted?: string;
      imagePreview?: string;
    }>
  >([
    {
      role: "assistant",
      text: "👋 ¡Hola Kike y Lara! Soy Pepe, vuestro asistente de acción del hogar. Podéis pedirme información o darme órdenes directas por voz, texto o subiendo una foto de un ticket:\n\n• *\"Añade leche y plátanos al Mercadona\"*\n• *\"Se ha acabado el papel higiénico en la despensa\"*\n• *\"Mañana Kike lleva a Fabio al cole y Lara lo recoge\"*\n• *\"Añade tarea para Kike: pedir cita pediatra el viernes\"*\n• *\"¿Qué ropa les pongo hoy a los niños con el frío de Salamanca?\"*\n• O pulsa 📷 **Cámara** o 🖼️ **Galería** para que registre y organice automáticamente un ticket de gasto.",
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
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            setInput(transcript);
            setIsListening(false);
            wasVoiceInputRef.current = true;
            handleSend(transcript, true);
          }
        };

        recognition.onerror = (e: any) => {
          setIsListening(false);
          if (e?.error === "not-allowed") {
            setVoiceError(
              "Permiso de micrófono bloqueado. Toca el candado o icono de permisos en la barra del navegador para permitir el micrófono a Pepe."
            );
          } else if (e?.error !== "no-speech") {
            console.warn("Speech recognition error:", e?.error);
          }
        };

        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Iniciar escucha automática por voz si se abrió desde el botón de micrófono
  useEffect(() => {
    if (isOpen && startWithVoice) {
      const t = setTimeout(() => {
        if (recognitionRef.current && !isListening) {
          try {
            setInput("");
            setVoiceError(null);
            stopSpeaking();
            wasVoiceInputRef.current = true;
            recognitionRef.current.start();
            setIsListening(true);
          } catch {
            // Ya iniciado
          }
        }
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, startWithVoice]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      setInput("");
      setVoiceError(null);
      stopSpeaking();
      try {
        wasVoiceInputRef.current = true;
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
    const cleanText = text
      .replace(/[*#_`]/g, "")
      .replace(/•/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 350));
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleCloseModal = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
    stopSpeaking();
    onClose();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }

    const handleBackdropClick = (event: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) {
        handleCloseModal();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [isOpen, onClose]);

  const handleSend = (textToSend?: string, fromVoice: boolean = false) => {
    const q = (textToSend || input).trim();
    if (!q || isPending) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    if (!textToSend) setInput("");
    setLastAction(null);
    setVoiceError(null);

    const isVoice = fromVoice || wasVoiceInputRef.current;
    wasVoiceInputRef.current = false;

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
        if (isVoice && voiceReplyEnabled) {
          speakText(res.message);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "⚠️ Error al conectar con el agente del hogar." },
        ]);
      }
    });
  };

  const handleProcessReceipt = (file: File) => {
    if (!file || isPending) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type || "image/jpeg";

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: `📸 [Ticket adjuntado: ${file.name}]`,
          imagePreview: dataUrl,
        },
      ]);

      startTransition(async () => {
        try {
          const res = await processReceiptImageAction(base64, mimeType);
          const storeName = res.storeName || "Establecimiento";
          const totalVal = typeof res.totalAmount === "number" ? res.totalAmount.toFixed(2) : "0.00";
          const catName = res.items?.[0]?.category || "Alimentación";
          const itemsSummary = res.items?.length
            ? res.items.slice(0, 5).map((i) => `${i.name} (${i.totalPrice.toFixed(2)}€)`).join(", ")
            : "Artículos reconocidos";

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: `✅ **¡Ticket procesado y organizado por Pepe!**\n\n• **Comercio:** ${storeName}\n• **Importe:** ${totalVal} €\n• **Categoría:** ${catName}\n• **Fecha:** ${res.date || "Hoy"}\n• **Productos (${res.items?.length || 0}):** ${itemsSummary}${res.items && res.items.length > 5 ? "..." : ""}\n\nEl gasto ha quedado registrado en el desglose de Economía y los productos se han actualizado en la despensa.`,
              actionExecuted: `Ticket de ${totalVal} € registrado en ${storeName} (${catName})`,
            },
          ]);
          setLastAction(`Ticket de ${totalVal} € en ${storeName} guardado con éxito`);
        } catch (err: any) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: `⚠️ No he podido procesar el ticket automáticamente: ${err?.message || "Error al leer imagen"}. Puedes introducir el gasto manualmente.`,
            },
          ]);
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const actionPrompts = [
    "📅 Apuntar dentista para Lara el viernes a las 17:30",
    "🛒 Añadir leche y huevos a Mercadona",
    "✅ Tarea para Kike: Pedir cita pediatra para Bruno",
    "📦 Se ha terminado el aceite en la despensa",
    "🏫 Mañana Kike lleva a Fabio y Lara lo recoge",
    "🍲 Cenamos la opción Cecotec Mambo",
    "🚗 ¿A qué hora cargo el coche eléctrico hoy?",
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="assistant-title"
      style={{
        maxWidth: "640px",
        height: "min(640px, 86vh)",
        display: isOpen ? "flex" : "none",
        flexDirection: "column",
        border: "1px solid var(--apple-border)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* Tirador para deslizar en smartphone */}
      <div className="sheet-handle" />

      {/* Cabecera estilo Apple Intelligence Sheet */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          borderBottom: "1px solid var(--apple-border)",
          paddingBottom: "0.85rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #FF2D55 0%, #AF52DE 35%, #0071E3 70%, #34C759 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(175, 82, 222, 0.35)",
            }}
          >
            <IconSparkles size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <h2 id="assistant-title" style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                Pepe · Asistente del Hogar
              </h2>
              <span className="badge badge-purple" style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
                Tool Calling Activo
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Agenda, Tareas, Compras y Hogar sincronizados en tiempo real
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Botón Silenciar/Activar Voz de Pepe */}
          <button
            type="button"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setVoiceReplyEnabled(!voiceReplyEnabled);
            }}
            className="btn-ghost"
            style={{
              padding: "0.3rem 0.65rem",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              background: voiceReplyEnabled ? "rgba(0, 113, 227, 0.15)" : "var(--apple-surface-secondary)",
              color: voiceReplyEnabled ? "var(--apple-blue)" : "var(--apple-text-tertiary)",
              border: "1px solid var(--apple-border)",
            }}
            title={voiceReplyEnabled ? "Respuesta por voz activada (Toca para silenciar)" : "Respuesta por voz desactivada (Toca para activar)"}
          >
            {voiceReplyEnabled ? <IconVolume2 size={15} /> : <IconVolumeX size={15} />}
            <span>{voiceReplyEnabled ? "Voz activa" : "Silencio"}</span>
          </button>

          <button
            onClick={handleCloseModal}
            className="btn-ghost"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              padding: 0,
              justifyContent: "center",
              fontSize: "1.1rem",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Banner de escucha activa de voz */}
      {isListening && (
        <div
          style={{
            padding: "0.65rem 1rem",
            marginBottom: "0.75rem",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, rgba(255, 59, 48, 0.15), rgba(255, 149, 0, 0.15))",
            border: "1px solid rgba(255, 59, 48, 0.4)",
            color: "var(--apple-text)",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            boxShadow: "0 0 16px rgba(255, 59, 48, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="pulse-indicator" style={{ background: "#FF3B30", width: "10px", height: "10px" }} />
            <span style={{ fontWeight: 600 }}>🎙️ Pepe te está escuchando...</span>
            <span style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)" }}>
              (Habla claro hacia la tablet)
            </span>
          </div>
          <button
            type="button"
            onClick={toggleVoice}
            className="btn-secondary"
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem", borderRadius: "var(--radius-full)" }}
          >
            Detener
          </button>
        </div>
      )}

      {/* Banner de respuesta de Pepe hablando en voz alta */}
      {isSpeaking && (
        <div
          onClick={stopSpeaking}
          style={{
            padding: "0.6rem 0.95rem",
            marginBottom: "0.75rem",
            borderRadius: "var(--radius-md)",
            background: "rgba(0, 113, 227, 0.15)",
            border: "1px solid rgba(0, 113, 227, 0.4)",
            color: "var(--apple-blue)",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            fontWeight: 600,
          }}
          title="Toca para silenciar"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🔊</span>
            <span>Pepe está respondiendo en voz alta...</span>
          </div>
          <span style={{ fontSize: "0.75rem", textDecoration: "underline" }}>Pausar voz</span>
        </div>
      )}

      {/* Banner de error de permisos de micrófono si procede */}
      {voiceError && (
        <div
          style={{
            padding: "0.6rem 0.95rem",
            marginBottom: "0.75rem",
            borderRadius: "var(--radius-md)",
            background: "rgba(255, 59, 48, 0.12)",
            border: "1px solid rgba(255, 59, 48, 0.35)",
            color: "var(--apple-red)",
            fontSize: "0.825rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <span>⚠️ {voiceError}</span>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="btn-ghost"
            style={{ padding: "0.1rem 0.4rem", fontSize: "0.75rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner de última acción ejecutada con estilo Apple */}
      {lastAction && (
        <div
          style={{
            padding: "0.6rem 0.95rem",
            marginBottom: "0.75rem",
            borderRadius: "var(--radius-md)",
            background: "var(--apple-green-subtle)",
            border: "1px solid rgba(52, 199, 89, 0.3)",
            color: "var(--apple-green)",
            fontSize: "0.825rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontWeight: 600,
          }}
        >
          <span>✓</span>
          <span>Acción ejecutada: {lastAction}</span>
        </div>
      )}

      {/* Prompts Rápidos (Píldoras Apple) */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
          marginBottom: "0.75rem",
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
              fontSize: "0.76rem",
              padding: "0.35rem 0.75rem",
              whiteSpace: "nowrap",
              borderRadius: "var(--radius-full)",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Historial de Mensajes estilo Apple iMessage */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          paddingRight: "0.4rem",
          marginBottom: "1rem",
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "86%",
              padding: "0.8rem 1.05rem",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              fontSize: "0.9rem",
              lineHeight: 1.5,
              background: m.role === "user" ? "var(--apple-blue)" : "var(--apple-surface-secondary)",
              color: m.role === "user" ? "#ffffff" : "var(--apple-text)",
              border: m.role === "user" ? "none" : "1px solid var(--apple-border)",
              boxShadow: m.role === "user" ? "0 2px 8px rgba(0, 113, 227, 0.25)" : "none",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

            {m.imagePreview && (
              <img
                src={m.imagePreview}
                alt="Ticket adjuntado"
                style={{
                  maxWidth: "180px",
                  maxHeight: "180px",
                  borderRadius: "var(--radius-md)",
                  objectFit: "cover",
                  marginTop: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                }}
              />
            )}

            {m.actionExecuted && (
              <div
                style={{
                  marginTop: "0.6rem",
                  padding: "0.4rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--apple-green-subtle)",
                  border: "1px solid rgba(52, 199, 89, 0.3)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--apple-green)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>✓</span>
                <span>{m.actionExecuted}</span>
              </div>
            )}

            {m.role === "assistant" && (
              <div style={{ marginTop: "0.45rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => speakText(m.text)}
                  className="btn-ghost"
                  title="Escuchar respuesta por altavoz"
                  style={{ fontSize: "0.76rem", padding: "0.2rem 0.45rem", color: "var(--apple-text-secondary)" }}
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
              gap: "0.55rem",
              padding: "0.7rem 1rem",
              background: "var(--apple-surface-secondary)",
              borderRadius: "18px 18px 18px 4px",
              fontSize: "0.85rem",
              color: "var(--apple-purple)",
              fontWeight: 500,
              border: "1px solid var(--apple-border)",
            }}
          >
            <span className="pulse-indicator" style={{ background: "var(--apple-purple)" }} />
            <span>Ejecutando acción con el agente...</span>
          </div>
        )}
      </div>

      {/* Input estilo Apple Siri / Messages Bar con Cámara y Galería */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}
      >
        {/* Inputs ocultos para Cámara y Galería */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleProcessReceipt(f);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleProcessReceipt(f);
            e.target.value = "";
          }}
        />

        {/* Botón Cámara rápida para ticket */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isPending}
          title="Tomar foto de ticket con la cámara"
          className="touch-target"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            flexShrink: 0,
            background: "var(--apple-surface-secondary)",
            border: "1px solid var(--apple-border)",
            color: "var(--apple-text)",
            cursor: "pointer",
          }}
        >
          📷
        </button>

        {/* Botón Galería para ticket */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isPending}
          title="Seleccionar ticket de la galería"
          className="touch-target"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            flexShrink: 0,
            background: "var(--apple-surface-secondary)",
            border: "1px solid var(--apple-border)",
            color: "var(--apple-text)",
            cursor: "pointer",
          }}
        >
          🖼️
        </button>

        {speechSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            disabled={isPending}
            title={isListening ? "Detener escucha" : "Hablar con el agente (Reconocimiento de voz)"}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
              background: isListening
                ? "linear-gradient(135deg, #FF3B30, #FF9500)"
                : "var(--apple-surface-secondary)",
              color: isListening ? "#ffffff" : "var(--apple-text)",
              border: isListening ? "2px solid #FF3B30" : "1px solid var(--apple-border)",
              boxShadow: isListening ? "0 0 16px rgba(255, 59, 48, 0.5)" : "var(--shadow-sm)",
              animation: isListening ? "applePulse 1.5s infinite ease-in-out" : "none",
            }}
          >
            {isListening ? "⏹️" : "🎙️"}
          </button>
        )}

        <input
          type="text"
          placeholder={
            isListening
              ? "🎙️ Escuchando... Di algo como 'añade plátanos al Mercadona'"
              : "Escribe o usa el micrófono..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          className="input-field"
          style={{
            flex: 1,
            height: "44px",
            borderRadius: "var(--radius-full)",
            paddingLeft: "1.1rem",
            paddingRight: "1.1rem",
            borderColor: isListening ? "var(--apple-red)" : undefined,
          }}
        />

        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="btn-primary"
          style={{
            height: "44px",
            padding: "0 1.25rem",
            borderRadius: "var(--radius-full)",
            fontSize: "0.88rem",
          }}
        >
          Enviar
        </button>
      </form>
    </dialog>
  );
}
