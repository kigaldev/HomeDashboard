"use client";

import { useState, useEffect, useRef } from "react";
import { IconCamera } from "./Icons";

const DEFAULT_PHOTO = "/photos/familia-feliz-gallego.jpg";

export function FamilyPhotoFrame({
  onTriggerScreensaver,
}: {
  onTriggerScreensaver?: () => void;
} = {}) {
  const [photos, setPhotos] = useState<string[]>([DEFAULT_PHOTO]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string>(DEFAULT_PHOTO);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de fotos del repositorio y preferencia guardada
  useEffect(() => {
    let isMounted = true;

    async function loadPhotos() {
      try {
        const res = await fetch("/api/photos");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.photos) && data.photos.length > 0 && isMounted) {
            setPhotos(data.photos);

            // Revisar si el usuario tenía una foto seleccionada previamente
            const saved = localStorage.getItem("hd_family_photo");
            if (saved && data.photos.includes(saved)) {
              setPhotoUrl(saved);
              setCurrentIndex(data.photos.indexOf(saved));
            } else {
              setPhotoUrl(data.photos[0]);
              setCurrentIndex(0);
            }
            return;
          }
        }
      } catch {}

      // Fallback
      if (isMounted) {
        const saved = localStorage.getItem("hd_family_photo");
        if (saved) setPhotoUrl(saved);
      }
    }

    loadPhotos();

    return () => {
      isMounted = false;
    };
  }, []);

  // Transición suave entre fotos si hay varias (cada 45 segundos, típico de marco digital)
  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % photos.length;
        setPhotoUrl(photos[next]);
        return next;
      });
    }, 45000);
    return () => clearInterval(interval);
  }, [photos]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setPhotoUrl(data.url);
          setPhotos((prev) => [data.url, ...prev.filter((p) => p !== data.url)]);
          setCurrentIndex(0);
          try {
            localStorage.setItem("hd_family_photo", data.url);
          } catch {}
          setIsUploading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("[photo-frame] Error subiendo foto al servidor:", err);
    }

    // Fallback local en caso de desconexión
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoUrl(result);
      try {
        localStorage.setItem("hd_family_photo", result);
      } catch {}
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length <= 1) return;
    const prev = (currentIndex - 1 + photos.length) % photos.length;
    setCurrentIndex(prev);
    setPhotoUrl(photos[prev]);
    try {
      localStorage.setItem("hd_family_photo", photos[prev]);
    } catch {}
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length <= 1) return;
    const next = (currentIndex + 1) % photos.length;
    setCurrentIndex(next);
    setPhotoUrl(photos[next]);
    try {
      localStorage.setItem("hd_family_photo", photos[next]);
    } catch {}
  };

  return (
    <div
      className="liquid-glass liquid-specular"
      style={{
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        position: "relative",
        minHeight: "490px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        boxShadow: "var(--liquid-shadow-elevated)",
      }}
    >
      {/* Imagen de Fondo o Fotografía Familiar */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Fotografía Familia Feliz Gallego"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.92)",
            transition: "opacity 0.6s ease-in-out",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(236, 72, 153, 0.2) 50%, rgba(245, 158, 11, 0.2) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", padding: "1.25rem" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "0.4rem" }}>👨‍👩‍👦‍👦</span>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--apple-text)" }}>
              Familia Feliz Gallego
            </span>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: "0.2rem 0 0 0" }}>
              Kike · Lara · Fabio · Bruno
            </p>
          </div>
        </div>
      )}

      {/* Flechas táctiles si hay más de 1 fotografía */}
      {photos.length > 1 && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "var(--radius-full)",
            padding: "0.2rem 0.5rem",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "0.75rem",
              cursor: "pointer",
              padding: "0.15rem 0.3rem",
            }}
            title="Foto anterior"
          >
            ‹
          </button>
          <span style={{ fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.8)", fontWeight: 600 }}>
            {currentIndex + 1} / {photos.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "0.75rem",
              cursor: "pointer",
              padding: "0.15rem 0.3rem",
            }}
            title="Siguiente foto"
          >
            ›
          </button>
        </div>
      )}

      {/* Degradado inferior para legibilidad perfecta del pie de foto */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Controles y Datos al Pie del Marco */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0.95rem 1.15rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.95rem" }}>🏡</span>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#ffffff", letterSpacing: "-0.01em" }}>
              Familia Feliz Gallego
            </h3>
          </div>
          <p style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.75)", margin: "0.15rem 0 0 0" }}>
            Kike & Lara · Salamanca, España
          </p>
        </div>

        {/* Botón para cambiar / subir fotografía al repositorio y pantalla completa */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {onTriggerScreensaver && (
            <button
              type="button"
              onClick={onTriggerScreensaver}
              className="btn-ghost touch-target"
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(0, 0, 0, 0.45)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "0.75rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                cursor: "pointer",
              }}
              title="Ver en pantalla completa (Modo Fondo de Pantalla)"
            >
              <span>🖼️</span>
              <span className="hide-on-mobile">Pantalla completa</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost touch-target"
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "var(--radius-full)",
              background: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontSize: "0.75rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: isUploading ? "wait" : "pointer",
            }}
          >
            <IconCamera size={13} />
            <span>{isUploading ? "Guardando..." : "Añadir foto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
