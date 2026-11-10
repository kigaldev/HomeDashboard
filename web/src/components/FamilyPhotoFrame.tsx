"use client";

import { useState, useEffect, useRef } from "react";
import { IconCamera } from "./Icons";

export function FamilyPhotoFrame() {
  const [photoUrl, setPhotoUrl] = useState<string | null>("/IMG_3395.JPG");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hd_family_photo");
      if (saved) setPhotoUrl(saved);
      else setPhotoUrl("/IMG_3395.JPG");
    } catch {
      setPhotoUrl("/IMG_3395.JPG");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoUrl(result);
      try {
        localStorage.setItem("hd_family_photo", result);
      } catch (err) {
        console.warn("[photo-frame] Error saving photo to localStorage:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="liquid-glass liquid-specular"
      style={{
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        position: "relative",
        minHeight: "210px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        boxShadow: "var(--liquid-shadow-elevated)",
      }}
    >
      {/* Imagen de Fondo o Marco Artístico Familiar */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Fotografía familiar"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.92)",
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

        {/* Botón para cambiar / subir fotografía */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            type="button"
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
              cursor: "pointer",
            }}
          >
            <IconCamera size={13} />
            <span>{photoUrl ? "Cambiar foto" : "Subir foto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

