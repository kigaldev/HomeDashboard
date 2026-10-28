"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { scanTicketAction, executeReceiptActionsAction } from "@/app/actions";
import type {
  ParsedReceiptWithMatches,
  ParsedReceiptItem,
  ReceiptActionConfig,
  ReceiptExecutionResult,
} from "@/lib/receiptShared";
import { IconCamera, IconReceipt } from "./Icons";

interface TicketManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "camera" | "upload" | "text";
}

/** Redimensiona y comprime cualquier foto en el navegador a JPEG max 1600px */
async function compressImage(fileOrBlob: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ base64: "", mimeType: "image/jpeg" });
    };
    reader.onload = () => {
      const originalResult = (reader.result as string) || "";
      const img = new Image();
      img.onerror = () => {
        resolve({ base64: originalResult, mimeType: (fileOrBlob as File).type || "image/jpeg" });
      };
      img.onload = () => {
        try {
          const MAX_DIM = 1600;
          let width = img.width || 800;
          let height = img.height || 600;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ base64: originalResult, mimeType: "image/jpeg" });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          resolve({ base64: compressedBase64, mimeType: "image/jpeg" });
        } catch {
          resolve({ base64: originalResult, mimeType: "image/jpeg" });
        }
      };
      img.src = originalResult;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

export function TicketManagerModal({
  isOpen,
  onClose,
  initialMode = "camera",
}: TicketManagerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputNativeCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  // Estados del flujo
  const [step, setStep] = useState<"capture" | "review" | "success">("capture");
  const [activeCaptureTab, setActiveCaptureTab] = useState<"camera" | "upload" | "text">(initialMode);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cámara en vivo
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [streamTrack, setStreamTrack] = useState<MediaStream | null>(null);

  // Datos capturados
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");

  // Ticket parseado y editable
  const [parsedData, setParsedData] = useState<ParsedReceiptWithMatches | null>(null);

  // Configuración de acciones a realizar en esa única ventana
  const [saveExpense, setSaveExpense] = useState(true);
  const [selectedShoppingIds, setSelectedShoppingIds] = useState<number[]>([]);
  const [updatePantry, setUpdatePantry] = useState(true);
  const [trackPerishables, setTrackPerishables] = useState(true);
  const [showWarrantyFields, setShowWarrantyFields] = useState(false);
  const [warrantyItemName, setWarrantyItemName] = useState("");
  const [warrantyYears, setWarrantyYears] = useState(3);

  // Nuevo item manual
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Despensa");

  // Resultado de la ejecución
  const [executionResult, setExecutionResult] = useState<ReceiptExecutionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Control nativo de <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      stopLiveCamera();
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Manejo de la cámara en vivo
  const startLiveCamera = async (mode: "environment" | "user" = facingMode) => {
    stopLiveCamera();
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no soporta acceso directo a la cámara. Usa el botón de Cámara Móvil.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStreamTrack(stream);
      setIsLiveCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Error accediendo a cámara en vivo:", err);
      setIsLiveCameraActive(false);
      setErrorMessage(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Permiso denegado para usar la cámara. Puedes conceder permiso en los ajustes de tu navegador o usar 'Cámara Rápida Móvil'."
          : "No se pudo iniciar la cámara en directo. Pulsa en 'Hacer Foto Móvil' o sube una imagen."
      );
    }
  };

  const stopLiveCamera = () => {
    if (streamTrack) {
      streamTrack.getTracks().forEach((track) => track.stop());
      setStreamTrack(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraActive(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  const capturePhotoFromLiveCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopLiveCamera();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setImagePreview(dataUrl);

    // Proceder al análisis con la foto capturada
    await runAnalysis({ imageBase64: dataUrl, mimeType: "image/jpeg" });
  };

  // Subida desde selector de archivo / cámara nativa
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setIsScanning(true);
    setScanStatusText("📸 Optimizando foto del ticket...");

    try {
      const { base64, mimeType } = await compressImage(file);
      setImagePreview(base64);
      await runAnalysis({ imageBase64: base64, mimeType });
    } catch (err: any) {
      setIsScanning(false);
      setErrorMessage(err.message || "Error al procesar la imagen del ticket.");
    }
  };

  // Ejecución del análisis OCR / IA
  const runAnalysis = async (params: { imageBase64?: string; mimeType?: string; text?: string }) => {
    setIsScanning(true);
    setScanStatusText("🤖 Analizando ticket con IA y comprobando lista de la compra...");
    setErrorMessage(null);

    try {
      const result = await scanTicketAction(params);
      if (!result.items || result.items.length === 0) {
        setErrorMessage(
          "⚠️ No se han detectado productos claros en el ticket. Puedes revisar la foto, editar los datos o pegar el texto."
        );
      }

      setParsedData(result);
      // Por defecto, preseleccionamos todos los productos de la lista de la compra que coinciden
      setSelectedShoppingIds(result.matchedShoppingItems.map((m) => m.id));
      setStep("review");
    } catch (err: any) {
      console.error("Error analizando ticket:", err);
      setErrorMessage("Error al analizar el ticket. Comprueba que el texto o imagen sea legible.");
    } finally {
      setIsScanning(false);
      setScanStatusText("");
    }
  };

  // Carga de tickets de prueba (Mercadona, Carrefour, Lidl)
  const handleLoadSample = (store: "Mercadona" | "Carrefour" | "Lidl") => {
    let sample = "";
    if (store === "Mercadona") {
      sample = `MERCADONA S.A.
C/ Toro 45, Salamanca
LECHE ENTERA HACENDADO 6x1L 5.76
HUEVOS CAMPEROS L 2.35
YOGUR NATURAL PACK 8 1.25
PAÑALES TALLA 4 BRUNO 14.50
PLATANOS DE CANARIAS 1.5KG 2.85
PECHUGA DE POLLO CORRAL 8.74
TOTAL 35.45 €`;
    } else if (store === "Carrefour") {
      sample = `CARREFOUR Salamanca
LOMOS MERLUZA FRESCA 11.20
SALMON FRESCO FILETES 12.50
JUDIAS VERDES PLANAS 2.10
ZANAHORIAS BOLSA 1KG 1.15
LECHE ENTERA CARREFOUR 6.10
TOTAL 33.05 €`;
    } else {
      sample = `LIDL Salamanca
PAN DE HOGAZA ARTESANO 1.45
PAPEL HIGIENICO 3 CAPAS 4.20
HUEVOS CAMPEROS L 2.25
LECHE ENTERA MILBONA 5.70
MANZANAS GOLDEN 2.90
TOTAL 16.50 €`;
    }
    setRawText(sample);
    runAnalysis({ text: sample });
  };

  // Manejo de edición de productos en la pantalla única
  const handleItemNameChange = (index: number, newName: string) => {
    if (!parsedData) return;
    const nextItems = [...parsedData.items];
    nextItems[index] = { ...nextItems[index], name: newName };
    setParsedData({ ...parsedData, items: nextItems });
  };

  const handleItemPriceChange = (index: number, newPriceStr: string) => {
    if (!parsedData) return;
    const priceNum = parseFloat(newPriceStr) || 0;
    const nextItems = [...parsedData.items];
    nextItems[index] = { ...nextItems[index], totalPrice: priceNum, unitPrice: priceNum };
    const nextTotal = nextItems.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
    setParsedData({
      ...parsedData,
      items: nextItems,
      totalAmount: Math.round(nextTotal * 100) / 100,
    });
  };

  const handleTogglePerishable = (index: number) => {
    if (!parsedData) return;
    const nextItems = [...parsedData.items];
    const curr = nextItems[index].isPerishable;
    nextItems[index] = {
      ...nextItems[index],
      isPerishable: !curr,
      expiryDays: !curr ? (nextItems[index].expiryDays || 4) : undefined,
    };
    setParsedData({ ...parsedData, items: nextItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedData) return;
    const nextItems = parsedData.items.filter((_, i) => i !== index);
    const nextTotal = nextItems.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
    setParsedData({
      ...parsedData,
      items: nextItems,
      totalAmount: Math.round(nextTotal * 100) / 100,
    });
  };

  const handleAddNewItem = () => {
    if (!parsedData || !newItemName.trim()) return;
    const price = parseFloat(newItemPrice) || 0;
    const isPerish = newItemCategory === "Carnicería" || newItemCategory === "Pescadería" || newItemCategory === "Fruta y Verdura" || newItemCategory === "Lácteos";
    const newItem: ParsedReceiptItem = {
      name: newItemName.trim(),
      totalPrice: price,
      unitPrice: price,
      category: newItemCategory,
      isPerishable: isPerish,
      expiryDays: isPerish ? 4 : undefined,
    };

    const nextItems = [...parsedData.items, newItem];
    const nextTotal = nextItems.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
    setParsedData({
      ...parsedData,
      items: nextItems,
      totalAmount: Math.round(nextTotal * 100) / 100,
    });
    setNewItemName("");
    setNewItemPrice("");
    setIsAddingItem(false);
  };

  // Toggle de selección de items de lista de compra a tachar
  const toggleShoppingMatch = (id: number) => {
    setSelectedShoppingIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAllShoppingMatches = () => {
    if (!parsedData) return;
    if (selectedShoppingIds.length === parsedData.matchedShoppingItems.length) {
      setSelectedShoppingIds([]);
    } else {
      setSelectedShoppingIds(parsedData.matchedShoppingItems.map((m) => m.id));
    }
  };

  // Confirmación y ejecución de acciones
  const handleConfirmAndApply = () => {
    if (!parsedData) return;

    startTransition(async () => {
      try {
        const config: ReceiptActionConfig = {
          saveExpense,
          shoppingItemIds: selectedShoppingIds,
          updatePantry,
          trackPerishables,
          registerWarranty: showWarrantyFields && warrantyItemName.trim()
            ? {
                itemName: warrantyItemName.trim(),
                warrantyYears,
                price: parsedData.totalAmount,
              }
            : null,
        };

        const result = await executeReceiptActionsAction(
          parsedData,
          config,
          rawText || (imagePreview ? "[Ticket escaneado por foto]" : undefined)
        );

        setExecutionResult(result);
        setStep("success");
      } catch (err: any) {
        console.error("Error ejecutando acciones de ticket:", err);
        setErrorMessage("Error al guardar las acciones seleccionadas. Por favor reintenta.");
      }
    });
  };

  const handleReset = () => {
    stopLiveCamera();
    setStep("capture");
    setImagePreview(null);
    setRawText("");
    setParsedData(null);
    setExecutionResult(null);
    setErrorMessage(null);
    setSelectedShoppingIds([]);
    setShowWarrantyFields(false);
    setWarrantyItemName("");
  };

  const handleCloseModal = () => {
    stopLiveCamera();
    handleReset();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleCloseModal}
      style={{
        maxWidth: "760px",
        width: "92vw",
        maxHeight: "92vh",
        display: isOpen ? "flex" : "none",
        flexDirection: "column",
        background: "var(--apple-bg)",
        border: "1px solid var(--apple-border-strong)",
        borderRadius: "var(--radius-xl)",
        padding: 0,
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
        color: "var(--apple-text)",
      }}
    >
      {/* ── HEADER DE LA VENTANA ÚNICA ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.4rem",
          background: "var(--apple-surface)",
          borderBottom: "1px solid var(--apple-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              background: "var(--apple-blue-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--apple-blue)",
            }}
          >
            <IconReceipt size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              Gestor Integral de Ticket
            </h2>
            <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0 }}>
              {step === "capture" && "Captura con cámara, sube foto o pega texto"}
              {step === "review" && "Revisa los datos y elige qué acciones ejecutar en una sola pantalla"}
              {step === "success" && "¡Acciones completadas con éxito!"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCloseModal}
          className="btn-secondary"
          style={{
            padding: "0.35rem 0.65rem",
            fontSize: "0.85rem",
            borderRadius: "var(--radius-full)",
          }}
          aria-label="Cerrar ventana"
        >
          ✕
        </button>
      </div>

      {/* ── CUERPO CON SCROLL ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.4rem" }}>
        {/* Feedback de error si ocurre */}
        {errorMessage && (
          <div
            style={{
              padding: "0.85rem 1.1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--apple-red-subtle)",
              border: "1px solid var(--apple-red)",
              color: "var(--apple-red)",
              fontSize: "0.83rem",
              marginBottom: "1rem",
              lineHeight: 1.4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* PASO 1: CAPTURA (CÁMARA DIRECTA, EN VIVO, GALERÍA O TEXTO)  */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {step === "capture" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {/* Input oculto para CÁMARA NATIVA RÁPIDA (capture="environment") */}
            <input
              ref={fileInputNativeCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelected}
              style={{ display: "none" }}
            />

            {/* Input oculto para GALERÍA / ARCHIVOS */}
            <input
              ref={fileInputGalleryRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              style={{ display: "none" }}
            />

            {/* Selector de modo de entrada */}
            <div
              style={{
                display: "flex",
                background: "var(--apple-surface-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "0.25rem",
                gap: "0.25rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  stopLiveCamera();
                  setActiveCaptureTab("camera");
                }}
                style={{
                  flex: 1,
                  padding: "0.55rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  background: activeCaptureTab === "camera" ? "var(--apple-surface-elevated)" : "transparent",
                  color: activeCaptureTab === "camera" ? "var(--apple-text)" : "var(--apple-text-secondary)",
                  boxShadow: activeCaptureTab === "camera" ? "var(--shadow-sm)" : "none",
                }}
              >
                📸 Cámara Móvil & Visor
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveCamera();
                  setActiveCaptureTab("upload");
                }}
                style={{
                  flex: 1,
                  padding: "0.55rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  background: activeCaptureTab === "upload" ? "var(--apple-surface-elevated)" : "transparent",
                  color: activeCaptureTab === "upload" ? "var(--apple-text)" : "var(--apple-text-secondary)",
                  boxShadow: activeCaptureTab === "upload" ? "var(--shadow-sm)" : "none",
                }}
              >
                🖼️ Subir Foto Guardada
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveCamera();
                  setActiveCaptureTab("text");
                }}
                style={{
                  flex: 1,
                  padding: "0.55rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  background: activeCaptureTab === "text" ? "var(--apple-surface-elevated)" : "transparent",
                  color: activeCaptureTab === "text" ? "var(--apple-text)" : "var(--apple-text-secondary)",
                  boxShadow: activeCaptureTab === "text" ? "var(--shadow-sm)" : "none",
                }}
              >
                📋 Pegar Texto / Demos
              </button>
            </div>

            {/* Spinner durante el escaneo */}
            {isScanning && (
              <div
                style={{
                  padding: "2rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.85rem",
                  border: "1px dashed var(--apple-blue)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "3px solid var(--apple-border)",
                    borderTopColor: "var(--apple-blue)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  {scanStatusText || "Analizando ticket..."}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)" }}>
                  Extrayendo artículos, tienda, fecha y comprobando coincidencias con tu lista de la compra...
                </div>
              </div>
            )}

            {/* TAB 1: CÁMARA */}
            {!isScanning && activeCaptureTab === "camera" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Botón de acceso directo a cámara de móvil */}
                <div
                  style={{
                    padding: "1.1rem",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--apple-blue-subtle)",
                    border: "1px solid var(--apple-blue)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                    Hacer Foto Directa con la Cámara
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--apple-text)", margin: 0, maxWidth: "480px" }}>
                    Abre la cámara de tu iPhone o móvil en un toque para fotografiar el ticket ahora mismo. Se optimizará y procesará automáticamente.
                  </p>

                  <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", justifyContent: "center" }}>
                    <label
                      className="btn-primary"
                      style={{
                        padding: "0.6rem 1.25rem",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        gap: "0.45rem",
                        boxShadow: "var(--shadow-glow)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <IconCamera size={18} />
                      <span>📸 Tomar Foto con la Cámara</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelected}
                        style={{ display: "none" }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => (!isLiveCameraActive ? startLiveCamera() : stopLiveCamera())}
                      className="btn-secondary"
                      style={{ padding: "0.6rem 1.1rem", fontSize: "0.88rem" }}
                    >
                      {isLiveCameraActive ? "⏹ Detener Visor" : "👁 Abrir Visor en Pantalla"}
                    </button>
                  </div>
                </div>

                {/* VISOR EN VIVO DE CÁMARA */}
                {isLiveCameraActive && (
                  <div
                    style={{
                      position: "relative",
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                      background: "#000",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        maxHeight: "380px",
                        objectFit: "cover",
                      }}
                    />

                    {/* Guía de encuadre superpuesta */}
                    <div
                      style={{
                        position: "absolute",
                        top: "12%",
                        left: "15%",
                        right: "15%",
                        bottom: "18%",
                        border: "2px dashed rgba(255, 255, 255, 0.75)",
                        borderRadius: "var(--radius-md)",
                        pointerEvents: "none",
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.35)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-24px",
                          left: 0,
                          right: 0,
                          textAlign: "center",
                          color: "#fff",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        }}
                      >
                        Encuadra el ticket aquí
                      </div>
                    </div>

                    {/* Barra de control inferior de la cámara */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "0.75rem",
                        background: "linear-gradient(transparent, rgba(0, 0, 0, 0.8))",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="btn-secondary"
                        style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", fontSize: "0.78rem" }}
                      >
                        🔄 Girar Cámara
                      </button>

                      <button
                        type="button"
                        onClick={capturePhotoFromLiveCamera}
                        className="btn-primary"
                        style={{
                          background: "#fff",
                          color: "#000",
                          borderRadius: "var(--radius-full)",
                          padding: "0.6rem 1.4rem",
                          fontWeight: 800,
                          fontSize: "0.88rem",
                        }}
                      >
                        ⚪ Capturar Foto
                      </button>

                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="btn-secondary"
                        style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", fontSize: "0.78rem" }}
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SUBIR FOTO */}
            {!isScanning && activeCaptureTab === "upload" && (
              <div
                style={{
                  padding: "2rem 1.5rem",
                  borderRadius: "var(--radius-lg)",
                  border: "2px dashed var(--apple-border-strong)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.85rem",
                  textAlign: "center",
                  background: "var(--apple-surface-secondary)",
                }}
              >
                <div style={{ fontSize: "2rem" }}>🖼️</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  Selecciona una foto de tu fototeca o galería
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", margin: 0, maxWidth: "420px" }}>
                  Admite cualquier formato de imagen (JPEG, PNG, HEIC de iPhone). Se optimizará automáticamente para que se procese al instante.
                </p>

                <label
                  className="btn-primary"
                  style={{
                    marginTop: "0.4rem",
                    fontSize: "0.88rem",
                    padding: "0.55rem 1.25rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <span>Examinar Galería / Archivos</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelected}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            )}

            {/* TAB 3: TEXTO / DEMOS */}
            {!isScanning && activeCaptureTab === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    Pega el texto del ticket o prueba con un supermercado:
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                    <button
                      type="button"
                      onClick={() => handleLoadSample("Mercadona")}
                      className="btn-secondary"
                      style={{ fontSize: "0.76rem", padding: "0.35rem 0.75rem" }}
                    >
                      🟢 Probar Mercadona (35,45 €)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample("Carrefour")}
                      className="btn-secondary"
                      style={{ fontSize: "0.76rem", padding: "0.35rem 0.75rem" }}
                    >
                      🔵 Probar Carrefour (33,05 €)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSample("Lidl")}
                      className="btn-secondary"
                      style={{ fontSize: "0.76rem", padding: "0.35rem 0.75rem" }}
                    >
                      🟡 Probar Lidl (16,50 €)
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  placeholder="Pega aquí las líneas del ticket de compra o PDF..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="input-field"
                  style={{
                    fontSize: "0.82rem",
                    fontFamily: "monospace",
                    background: "var(--apple-surface)",
                  }}
                />

                <button
                  type="button"
                  onClick={() => runAnalysis({ text: rawText })}
                  disabled={!rawText.trim()}
                  className="btn-primary"
                  style={{ alignSelf: "flex-start", padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
                >
                  Analizar Texto de Ticket
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* PASO 2: VENTANA ÚNICA DE GESTIÓN Y ACCIONES DEL TICKET       */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {step === "review" && parsedData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Banner de resumen del ticket detectado */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.75rem",
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--apple-surface-secondary)",
                border: "1px solid var(--apple-border)",
              }}
            >
              {/* Comercio */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--apple-text-secondary)", textTransform: "uppercase" }}>
                  Supermercado / Comercio
                </label>
                <input
                  type="text"
                  value={parsedData.storeName}
                  onChange={(e) => setParsedData({ ...parsedData, storeName: e.target.value })}
                  className="input-field"
                  style={{ marginTop: "0.2rem", fontWeight: 700, fontSize: "0.9rem" }}
                />
              </div>

              {/* Fecha */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--apple-text-secondary)", textTransform: "uppercase" }}>
                  Fecha de Compra
                </label>
                <input
                  type="date"
                  value={parsedData.date}
                  onChange={(e) => setParsedData({ ...parsedData, date: e.target.value })}
                  className="input-field"
                  style={{ marginTop: "0.2rem", fontSize: "0.85rem" }}
                />
              </div>

              {/* Importe Total */}
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--apple-text-secondary)", textTransform: "uppercase" }}>
                  Importe Total (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={parsedData.totalAmount}
                  onChange={(e) => setParsedData({ ...parsedData, totalAmount: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  style={{ marginTop: "0.2rem", fontWeight: 800, fontSize: "0.95rem", color: "var(--apple-blue)" }}
                />
              </div>
            </div>

            {/* ── PANEL DE ACCIONES A REALIZAR CON ESTE TICKET (NÚCLEO DE LA PETICIÓN) ── */}
            <div
              style={{
                padding: "1.1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--apple-surface-elevated)",
                border: "2px solid var(--apple-blue)",
                boxShadow: "var(--shadow-md)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                  ⚙️ Acciones a llevar a cabo con este ticket
                </h3>
                <span
                  style={{
                    fontSize: "0.74rem",
                    padding: "0.2rem 0.55rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-blue-subtle)",
                    color: "var(--apple-blue)",
                    fontWeight: 700,
                  }}
                >
                  Gestión Centralizada
                </span>
              </div>

              {/* ACCIÓN 1: Registrar en Gastos / Economía */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: saveExpense ? "var(--apple-green-subtle)" : "var(--apple-surface-secondary)",
                  border: `1px solid ${saveExpense ? "var(--apple-green)" : "var(--apple-border)"}`,
                }}
              >
                <input
                  type="checkbox"
                  id="act-save-expense"
                  checked={saveExpense}
                  onChange={(e) => setSaveExpense(e.target.checked)}
                  style={{ width: "18px", height: "18px", marginTop: "0.15rem", cursor: "pointer" }}
                />
                <label htmlFor="act-save-expense" style={{ cursor: "pointer", flex: 1 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    💶 Registrar en Gastos y Comparador de Precios
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.15rem" }}>
                    Suma {parsedData.totalAmount.toFixed(2)} € a los gastos de este mes y archiva los precios de cada artículo para el comparador familiar.
                  </div>
                </label>
              </div>

              {/* ACCIÓN 2: Tachar de la Lista de la Compra */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    🛒 Tachar de la Lista de la Compra ({selectedShoppingIds.length} seleccionados)
                  </div>
                  {parsedData.matchedShoppingItems.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllShoppingMatches}
                      className="btn-secondary"
                      style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}
                    >
                      {selectedShoppingIds.length === parsedData.matchedShoppingItems.length ? "Desmarcar todos" : "Marcar todos"}
                    </button>
                  )}
                </div>

                {parsedData.matchedShoppingItems.length === 0 ? (
                  <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)" }}>
                    ℹ️ No se han detectado coincidencias automáticas con productos pendientes de la lista de la compra.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.2rem" }}>
                    {parsedData.matchedShoppingItems.map((match) => {
                      const isChecked = selectedShoppingIds.includes(match.id);
                      return (
                        <div
                          key={match.id}
                          onClick={() => toggleShoppingMatch(match.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.45rem 0.65rem",
                            borderRadius: "var(--radius-sm)",
                            background: isChecked ? "var(--apple-blue-subtle)" : "var(--apple-surface)",
                            border: `1px solid ${isChecked ? "var(--apple-blue)" : "var(--apple-border)"}`,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // controlado por onClick del contenedor
                            style={{ cursor: "pointer" }}
                          />
                          <div style={{ flex: 1, fontSize: "0.8rem", color: "var(--apple-text)" }}>
                            <span style={{ fontWeight: 700 }}>{match.name}</span>
                            <span style={{ fontSize: "0.73rem", color: "var(--apple-text-secondary)", marginLeft: "0.4rem" }}>
                              (detectado en ticket como <em>&ldquo;{match.matchedWith}&rdquo;</em>)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ACCIÓN 3: Añadir a Despensa y Semáforo de Perecederos */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: updatePantry ? "var(--apple-teal-subtle)" : "var(--apple-surface-secondary)",
                  border: `1px solid ${updatePantry ? "var(--apple-teal)" : "var(--apple-border)"}`,
                }}
              >
                <input
                  type="checkbox"
                  id="act-update-pantry"
                  checked={updatePantry}
                  onChange={(e) => setUpdatePantry(e.target.checked)}
                  style={{ width: "18px", height: "18px", marginTop: "0.15rem", cursor: "pointer" }}
                />
                <label htmlFor="act-update-pantry" style={{ cursor: "pointer", flex: 1 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    🥫 Actualizar Despensa / Nevera y Vigilar Frescos
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.15rem" }}>
                    Marca los artículos como disponibles en la despensa y activa alertas automáticas en el semáforo para frescos (pescados, carnes, fruta, lácteos).
                  </div>
                </label>
              </div>

              {/* ACCIÓN 4: Garantía de Dispositivo o Electrodoméstico */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  padding: "0.75rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <input
                    type="checkbox"
                    id="act-warranty"
                    checked={showWarrantyFields}
                    onChange={(e) => setShowWarrantyFields(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="act-warranty" style={{ cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    🛡️ Registrar Garantía (para tecnología o electrodomésticos)
                  </label>
                </div>

                {showWarrantyFields && (
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.6rem", marginTop: "0.3rem" }}>
                    <input
                      type="text"
                      placeholder="Nombre del aparato (ej. Freidora Cecotec)"
                      value={warrantyItemName}
                      onChange={(e) => setWarrantyItemName(e.target.value)}
                      className="input-field"
                      style={{ fontSize: "0.82rem" }}
                    />
                    <select
                      value={warrantyYears}
                      onChange={(e) => setWarrantyYears(Number(e.target.value))}
                      className="input-field"
                      style={{ fontSize: "0.82rem" }}
                    >
                      <option value={3}>3 años (Legal)</option>
                      <option value={2}>2 años</option>
                      <option value={5}>5 años (Extendida)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* ── LISTADO DESGLOSADO DE ARTÍCULOS DETECTADOS ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "0.88rem", fontWeight: 700, margin: 0 }}>
                  Artículos del Ticket ({parsedData.items.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingItem(!isAddingItem)}
                  className="btn-secondary"
                  style={{ fontSize: "0.76rem", padding: "0.3rem 0.65rem" }}
                >
                  {isAddingItem ? "✕ Cancelar" : "+ Añadir producto"}
                </button>
              </div>

              {/* Formulario rápido para añadir producto extra */}
              {isAddingItem && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr auto",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--apple-surface-secondary)",
                    border: "1px solid var(--apple-border)",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Nombre del producto"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.8rem" }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio €"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.8rem" }}
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <option value="Despensa">Despensa</option>
                    <option value="Fruta y Verdura">Fruta y Verdura</option>
                    <option value="Carnicería">Carnicería</option>
                    <option value="Pescadería">Pescadería</option>
                    <option value="Lácteos">Lácteos</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Bebé / Higiene">Bebé / Higiene</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    disabled={!newItemName.trim()}
                    className="btn-primary"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
                  >
                    Añadir
                  </button>
                </div>
              )}

              {/* Tabla de artículos */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  maxHeight: "260px",
                  overflowY: "auto",
                  paddingRight: "0.25rem",
                }}
              >
                {parsedData.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--apple-surface-secondary)",
                      border: "1px solid var(--apple-border)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemNameChange(idx, e.target.value)}
                      className="input-field"
                      style={{ flex: 2, fontSize: "0.8rem", padding: "0.3rem 0.5rem" }}
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={item.totalPrice}
                      onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                      className="input-field"
                      style={{ width: "70px", fontSize: "0.8rem", padding: "0.3rem 0.5rem", textAlign: "right" }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>€</span>

                    <button
                      type="button"
                      onClick={() => handleTogglePerishable(idx)}
                      title={item.isPerishable ? "Perecedero (alerta de caducidad activada)" : "No perecedero"}
                      style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.72rem",
                        borderRadius: "var(--radius-full)",
                        border: "none",
                        cursor: "pointer",
                        background: item.isPerishable ? "var(--apple-orange-subtle)" : "var(--apple-surface-tertiary)",
                        color: item.isPerishable ? "var(--apple-orange)" : "var(--apple-text-tertiary)",
                        fontWeight: 600,
                      }}
                    >
                      {item.isPerishable ? `⏳ ${item.expiryDays || 4}d` : "📦 Seco"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      title="Eliminar este artículo"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--apple-red)",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        padding: "0 0.3rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── BOTONES DE CONFIRMACIÓN ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "0.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--apple-border)",
              }}
            >
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1rem" }}
              >
                ← Repetir / Otra foto
              </button>

              <button
                type="button"
                onClick={handleConfirmAndApply}
                disabled={isPending}
                className="btn-primary"
                style={{
                  fontSize: "0.9rem",
                  padding: "0.6rem 1.4rem",
                  fontWeight: 800,
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                {isPending ? "Aplicando acciones..." : "✅ Confirmar y Aplicar Acciones"}
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* PASO 3: CONFIRMACIÓN Y RESULTADO                             */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {step === "success" && executionResult && (
          <div
            style={{
              padding: "1.5rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-green-subtle)",
              border: "1px solid var(--apple-green)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--apple-green)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
              }}
            >
              ✓
            </div>

            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--apple-green)" }}>
                ¡Ticket Procesado con Éxito!
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--apple-text)", marginTop: "0.35rem", lineHeight: 1.4 }}>
                {executionResult.summaryMessage}
              </p>
            </div>

            {/* Badges de lo que se ha realizado */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              {executionResult.expensesSaved && (
                <span
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  💶 Gasto registrado
                </span>
              )}
              {executionResult.checkedShoppingCount > 0 && (
                <span
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  🛒 {executionResult.checkedShoppingCount} productos tachados
                </span>
              )}
              {executionResult.pantryCount > 0 && (
                <span
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  🥫 {executionResult.pantryCount} items a despensa
                </span>
              )}
              {executionResult.perishablesCount > 0 && (
                <span
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  ⏳ {executionResult.perishablesCount} frescos en semáforo
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.6rem" }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary"
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                Escanear otro ticket
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-primary"
                style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem", fontWeight: 700 }}
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
