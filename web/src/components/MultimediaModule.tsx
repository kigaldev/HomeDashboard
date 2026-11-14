"use client";

import { useState, useEffect, useRef } from "react";
import { searchYoutubeAction } from "@/app/actions";
import type { YoutubeSearchResult } from "@/lib/youtube";
import {
  IconMusic,
  IconTv,
  IconGlobe,
  IconPlay,
  IconPause,
  IconSkipBack,
  IconSkipForward,
  IconVolume2,
  IconVolumeX,
  IconSearch,
  IconExternalLink,
  IconArrowLeft,
  IconArrowRight,
  IconRotateCw,
} from "./Icons";

type MultimediaTab = "youtube" | "spotify" | "browser";

// Declaración global para la API de Spotify Web Playback SDK
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (data: any) => void) => boolean;
  removeListener: (event: string, cb?: (data: any) => void) => boolean;
  getCurrentState: () => Promise<any>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
}

export function MultimediaModule() {
  const [activeTab, setActiveTab] = useState<MultimediaTab>("youtube");

  // ── ESTADOS DE YOUTUBE ──
  const [youtubeQuery, setYoutubeQuery] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState<string>("QZ0gqJ3-33k"); // Pocoyó por defecto
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>("Pocoyó - Episodios Completos");
  const [searchResults, setSearchResults] = useState<YoutubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [youtubeSuggestions, setYoutubeSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentYoutubeSearches, setRecentYoutubeSearches] = useState<string[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── ESTADOS DE SPOTIFY CONNECT ──
  const [spotifyToken, setSpotifyToken] = useState<string>("");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyPlayerState, setSpotifyPlayerState] = useState<any>(null);
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState<string>(
    "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0"
  );
  const [spotifyVolume, setSpotifyVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);

  // ── ESTADOS DEL NAVEGADOR GOOGLE ──
  const GOOGLE_HOME_URL = "https://www.google.com/webhp?igu=1";
  const [browserUrlInput, setBrowserUrlInput] = useState(GOOGLE_HOME_URL);
  const [currentIframeUrl, setCurrentIframeUrl] = useState(GOOGLE_HOME_URL);
  const [browserHistory, setBrowserHistory] = useState<string[]>([GOOGLE_HOME_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Cargar token guardado de Spotify y búsquedas recientes de YouTube
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("kiosk_spotify_token");
      if (savedToken) {
        setSpotifyToken(savedToken);
        setTokenInput(savedToken);
      }
      try {
        const savedSearches = localStorage.getItem("kiosk_yt_recent_searches");
        if (savedSearches) {
          setRecentYoutubeSearches(JSON.parse(savedSearches));
        }
      } catch (err) {
        console.warn("Error leyendo búsquedas recientes:", err);
      }
    }
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autocompletado en vivo para el buscador de YouTube
  useEffect(() => {
    if (!youtubeQuery.trim() || youtubeQuery.length < 2) {
      setYoutubeSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(
            youtubeQuery.trim()
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.[1])) {
            setYoutubeSuggestions(data[1].slice(0, 6));
          }
        }
      } catch {
        // Fallback silencioso si la API de sugerencias está restringida
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [youtubeQuery]);

  // Ejecutar búsqueda real de YouTube (100% dentro de la pestaña)
  const executeYoutubeSearch = async (searchTerm: string) => {
    const clean = searchTerm.trim();
    if (!clean) return;

    setShowSuggestions(false);
    setYoutubeQuery(clean);
    setIsSearching(true);

    // Guardar en historial de búsquedas recientes del Kiosk (hasta 6)
    setRecentYoutubeSearches((prev) => {
      const updated = [clean, ...prev.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem("kiosk_yt_recent_searches", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const results = await searchYoutubeAction(clean);
      setSearchResults(results);

      // Si hay resultados, reproducir automáticamente el primer vídeo en el reproductor embebido
      if (results.length > 0) {
        setCurrentVideoId(results[0].id);
        setCurrentVideoTitle(results[0].title);
      }
    } catch (err) {
      console.error("[YouTube Search] Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleYoutubeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeYoutubeSearch(youtubeQuery);
  };

  const handleClearYoutubeSearch = () => {
    setYoutubeQuery("");
    setYoutubeSuggestions([]);
    setShowSuggestions(false);
  };

  const handleClearRecentSearches = () => {
    setRecentYoutubeSearches([]);
    try {
      localStorage.removeItem("kiosk_yt_recent_searches");
    } catch {}
  };

  // Inicializar Spotify Web Playback SDK
  useEffect(() => {
    if (!spotifyToken) return;

    let isMounted = true;

    const setupPlayer = () => {
      if (!window.Spotify || !spotifyToken) return;

      try {
        const player = new window.Spotify.Player({
          name: "Kiosk Salón (Familia Feliz)",
          getOAuthToken: (cb) => {
            cb(spotifyToken);
          },
          volume: spotifyVolume / 100,
        });

        player.addListener("ready", ({ device_id }) => {
          if (!isMounted) return;
          console.log("[Spotify Connect] Kiosk listo con Device ID:", device_id);
          setSpotifyDeviceId(device_id);
          setIsSpotifyConnected(true);
        });

        player.addListener("not_ready", ({ device_id }) => {
          if (!isMounted) return;
          console.warn("[Spotify Connect] Dispositivo desconectado:", device_id);
          setIsSpotifyConnected(false);
        });

        player.addListener("player_state_changed", (state) => {
          if (!isMounted) return;
          setSpotifyPlayerState(state);
        });

        player.addListener("initialization_error", ({ message }) => {
          console.error("[Spotify Connect] Error de inicialización:", message);
        });

        player.addListener("authentication_error", ({ message }) => {
          console.warn("[Spotify Connect] Error de autenticación:", message);
          setIsSpotifyConnected(false);
        });

        player.connect();
        playerRef.current = player;
      } catch (e) {
        console.error("[Spotify Connect] Error inicializando Web Playback SDK:", e);
      }
    };

    if (!window.Spotify) {
      const existingScript = document.getElementById("spotify-player-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "spotify-player-script";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
      window.onSpotifyWebPlaybackSDKReady = () => {
        setupPlayer();
      };
    } else {
      setupPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [spotifyToken]);

  // Manejar volumen de Spotify
  const handleVolumeChange = (newVol: number) => {
    setSpotifyVolume(newVol);
    if (playerRef.current) {
      playerRef.current.setVolume(newVol / 100);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      handleVolumeChange(spotifyVolume || 50);
    } else {
      setIsMuted(true);
      if (playerRef.current) {
        playerRef.current.setVolume(0);
      }
    }
  };

  // Guardar token de Spotify
  const handleSaveSpotifyToken = () => {
    const clean = tokenInput.trim();
    setSpotifyToken(clean);
    if (typeof window !== "undefined") {
      if (clean) {
        localStorage.setItem("kiosk_spotify_token", clean);
      } else {
        localStorage.removeItem("kiosk_spotify_token");
      }
    }
    setIsTokenModalOpen(false);
  };

  // Cargar playlist o track de Spotify desde URL o ID
  const handleSpotifyLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifyQuery.trim()) return;

    let q = spotifyQuery.trim();
    if (q.includes("open.spotify.com/")) {
      const parts = q.split("open.spotify.com/")[1]?.split("?")[0];
      if (parts) {
        setSpotifyEmbedUrl(`https://open.spotify.com/embed/${parts}?utm_source=generator&theme=0`);
        setSpotifyQuery("");
        return;
      }
    }
    if (/^[a-zA-Z0-9]{22}$/.test(q)) {
      setSpotifyEmbedUrl(`https://open.spotify.com/embed/playlist/${q}?utm_source=generator&theme=0`);
      setSpotifyQuery("");
      return;
    }
  };

  // Navegación estilo Chrome enfocada exclusivamente en Google
  const navigateTo = (rawUrl: string) => {
    let url = rawUrl.trim();
    if (!url) return;

    // Si es una búsqueda de texto (sin protocolo ni puntos), buscar directamente en Google
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (url.includes(".") && !url.includes(" ")) {
        url = "https://" + url;
      } else {
        url = `https://www.google.com/search?igu=1&q=${encodeURIComponent(url)}`;
      }
    }

    setBrowserUrlInput(url);
    setCurrentIframeUrl(url);

    const newHist = browserHistory.slice(0, historyIndex + 1);
    newHist.push(url);
    setBrowserHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleBrowserBack = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      const url = browserHistory[nextIdx];
      setBrowserUrlInput(url);
      setCurrentIframeUrl(url);
    }
  };

  const handleBrowserForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const url = browserHistory[nextIdx];
      setBrowserUrlInput(url);
      setCurrentIframeUrl(url);
    }
  };

  const handleBrowserReload = () => {
    const curr = currentIframeUrl;
    setCurrentIframeUrl("");
    setTimeout(() => {
      setCurrentIframeUrl(curr);
    }, 50);
  };

  const handleBrowserGoHome = () => {
    navigateTo(GOOGLE_HOME_URL);
  };

  const handleBrowserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(browserUrlInput);
  };

  const openInExternalTab = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="glass-card" style={{ padding: "1.25rem", borderRadius: "18px" }}>
      {/* ── Barra Superior / Selector de Fuentes Multimedia ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.1rem",
          paddingBottom: "0.85rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            className="squircle-icon"
            style={{
              background:
                activeTab === "youtube"
                  ? "rgba(255, 0, 0, 0.15)"
                  : activeTab === "spotify"
                  ? "rgba(30, 215, 96, 0.15)"
                  : "rgba(0, 122, 255, 0.15)",
              color:
                activeTab === "youtube"
                  ? "#ff3b30"
                  : activeTab === "spotify"
                  ? "#1ed760"
                  : "#007aff",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            {activeTab === "youtube" ? (
              <IconTv size={20} />
            ) : activeTab === "spotify" ? (
              <IconMusic size={20} />
            ) : (
              <IconGlobe size={20} />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Centro Multimedia & Web Kiosk
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Buscador de YouTube · Spotify Connect (SDK) · Google Navegador
            </p>
          </div>
        </div>

        {/* Selector estilo Segmented Control Apple Liquid Glass */}
        <div
          style={{
            display: "inline-flex",
            background: "rgba(0, 0, 0, 0.35)",
            backdropFilter: "blur(20px)",
            borderRadius: "var(--radius-full)",
            padding: "3px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <button
            onClick={() => setActiveTab("youtube")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-full)",
              border: "none",
              background: activeTab === "youtube" ? "#ff3b30" : "transparent",
              color: activeTab === "youtube" ? "#ffffff" : "var(--apple-text-secondary)",
              fontWeight: activeTab === "youtube" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <IconTv size={15} />
            YouTube
          </button>
          <button
            onClick={() => setActiveTab("spotify")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-full)",
              border: "none",
              background: activeTab === "spotify" ? "#1ed760" : "transparent",
              color: activeTab === "spotify" ? "#000000" : "var(--apple-text-secondary)",
              fontWeight: activeTab === "spotify" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <IconMusic size={15} />
            Spotify
          </button>
          <button
            onClick={() => setActiveTab("browser")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-full)",
              border: "none",
              background: activeTab === "browser" ? "var(--apple-blue)" : "transparent",
              color: activeTab === "browser" ? "#ffffff" : "var(--apple-text-secondary)",
              fontWeight: activeTab === "browser" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <IconGlobe size={15} />
            Google Web
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 🎥 1. PESTAÑA: YOUTUBE (SIN RECOMENDACIONES, RESULTADOS REALES)   */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "youtube" && (
        <div>
          {/* Buscador inteligente con sugerencias y ejecución embebida directa */}
          <div ref={searchContainerRef} style={{ position: "relative", marginBottom: "0.85rem" }}>
            <form
              onSubmit={handleYoutubeFormSubmit}
              style={{
                display: "flex",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <IconSearch
                  size={18}
                  style={{
                    position: "absolute",
                    left: "14px",
                    color: "var(--apple-text-secondary)",
                  }}
                />
                <input
                  type="text"
                  value={youtubeQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setYoutubeQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder="Escribe lo que quieras buscar en YouTube (ej. Pocoyó, canciones infantiles, recetas, música...)"
                  style={{
                    width: "100%",
                    padding: "0.75rem 2.4rem 0.75rem 2.6rem",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#ffffff",
                    fontSize: "0.92rem",
                    outline: "none",
                    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.4)",
                  }}
                />
                {youtubeQuery && (
                  <button
                    type="button"
                    onClick={handleClearYoutubeSearch}
                    style={{
                      position: "absolute",
                      right: "14px",
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                    }}
                    title="Borrar texto"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="btn btn-primary"
                style={{
                  borderRadius: "var(--radius-full)",
                  padding: "0 1.4rem",
                  background: "#ff3b30",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: isSearching ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  opacity: isSearching ? 0.7 : 1,
                }}
              >
                <IconSearch size={16} />
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
            </form>

            {/* Desplegable flotante de autocompletado en vivo */}
            {showSuggestions && youtubeSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "rgba(22, 22, 24, 0.95)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "14px",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6)",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {youtubeSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeYoutubeSearch(suggestion)}
                    style={{
                      width: "100%",
                      padding: "0.65rem 1rem",
                      background: "transparent",
                      border: "none",
                      borderBottom:
                        idx < youtubeSuggestions.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                      color: "#ffffff",
                      textAlign: "left",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <IconSearch size={14} style={{ opacity: 0.5 }} />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Búsquedas recientes del usuario (solo lo que la familia busca, sin recomendaciones fijas) */}
          {recentYoutubeSearches.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                overflowX: "auto",
                paddingBottom: "0.5rem",
                marginBottom: "0.6rem",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", whiteSpace: "nowrap" }}>
                🕒 Recientes:
              </span>
              {recentYoutubeSearches.map((term, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => executeYoutubeSearch(term)}
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {term}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearRecentSearches}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--apple-text-tertiary)",
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  marginLeft: "0.25rem",
                  whiteSpace: "nowrap",
                }}
                title="Borrar historial reciente"
              >
                (limpiar)
              </button>
            </div>
          )}

          {/* Reproductor Embebido de YouTube (100% en la pestaña, sin ventanas emergentes) */}
          <div
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#000000",
              aspectRatio: "16 / 9",
              width: "100%",
              minHeight: "340px",
              maxHeight: "520px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
              marginBottom: "1rem",
            }}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title="YouTube Kiosk Player"
              style={{ width: "100%", height: "100%", display: "block", border: "none" }}
            />
          </div>

          {/* Título del vídeo en reproducción */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0.85rem",
              background: "rgba(0, 0, 0, 0.3)",
              borderRadius: "12px",
              marginBottom: "1rem",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: "#ffffff",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              ▶ {currentVideoTitle}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#34c759", fontWeight: 600, flexShrink: 0, marginLeft: "1rem" }}>
              ● Reproduciendo en Kiosk
            </span>
          </div>

          {/* Listado de Resultados Reales de la Búsqueda (Toca para reproducir al instante) */}
          {searchResults.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--apple-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.65rem",
                }}
              >
                Resultados de la Búsqueda ({searchResults.length} vídeos encontrados · Toca para reproducir)
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {searchResults.map((item) => {
                  const isCurrent = currentVideoId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentVideoId(item.id);
                        setCurrentVideoTitle(item.title);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        background: isCurrent ? "rgba(255, 59, 48, 0.18)" : "rgba(255, 255, 255, 0.04)",
                        border: `1px solid ${isCurrent ? "#ff3b30" : "rgba(255, 255, 255, 0.08)"}`,
                        borderRadius: "14px",
                        overflow: "hidden",
                        padding: "0.5rem",
                        textAlign: "left",
                        cursor: "pointer",
                        gap: "0.5rem",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Miniatura */}
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          aspectRatio: "16 / 9",
                          borderRadius: "10px",
                          overflow: "hidden",
                          background: "#000000",
                        }}
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        {item.duration && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: "6px",
                              right: "6px",
                              background: "rgba(0, 0, 0, 0.8)",
                              color: "#ffffff",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                            }}
                          >
                            {item.duration}
                          </span>
                        )}
                      </div>

                      {/* Título y canal */}
                      <div>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: isCurrent ? "#ff3b30" : "#ffffff",
                            lineHeight: 1.3,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--apple-text-secondary)",
                            marginTop: "0.2rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.channel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 🎵 2. PESTAÑA: SPOTIFY CONNECT & WEB PLAYBACK SDK                */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "spotify" && (
        <div>
          {/* Barra de Estado de Spotify Connect */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              background: "rgba(30, 215, 96, 0.08)",
              border: "1px solid rgba(30, 215, 96, 0.25)",
              padding: "0.75rem 1rem",
              borderRadius: "14px",
              marginBottom: "1.1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: isSpotifyConnected ? "#1ed760" : "#ff9500",
                  boxShadow: `0 0 10px ${isSpotifyConnected ? "#1ed760" : "#ff9500"}`,
                  display: "inline-block",
                }}
              />
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>
                  {isSpotifyConnected
                    ? "Kiosk Salón conectado a Spotify Connect"
                    : "Modo Kiosk: Reproductor familiar listo"}
                </span>
                <p style={{ fontSize: "0.73rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                  {isSpotifyConnected
                    ? "Puedes transferir música directamente desde la app de Spotify en tu móvil tocando el icono de altavoz"
                    : "Usa el reproductor directo abajo o vincula tu cuenta para transferir música desde el móvil"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTokenModalOpen(true)}
              className="btn btn-secondary"
              style={{
                fontSize: "0.75rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
              }}
            >
              {spotifyToken ? "⚙️ Token de Spotify" : "🔑 Vincular Spotify Connect"}
            </button>
          </div>

          {/* Si está activo el Web Playback SDK con reproducción en curso */}
          {spotifyPlayerState && spotifyPlayerState.track_window?.current_track ? (
            <div
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: "1.1rem",
                marginBottom: "1.2rem",
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
                flexWrap: "wrap",
              }}
            >
              {/* Carátula */}
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  flexShrink: 0,
                  background: "#121212",
                }}
              >
                {spotifyPlayerState.track_window.current_track.album?.images?.[0]?.url ? (
                  <img
                    src={spotifyPlayerState.track_window.current_track.album.images[0].url}
                    alt="Album Art"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#1ed760",
                    }}
                  >
                    <IconMusic size={32} />
                  </div>
                )}
              </div>

              {/* Información de pista */}
              <div style={{ flex: 1, minWidth: "180px" }}>
                <span
                  style={{
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#1ed760",
                    fontWeight: 700,
                  }}
                >
                  Sonando en Kiosk Salón
                </span>
                <h3
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    margin: "0.15rem 0",
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {spotifyPlayerState.track_window.current_track.name}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                  {spotifyPlayerState.track_window.current_track.artists
                    ?.map((a: any) => a.name)
                    .join(", ")}
                </p>

                {/* Controles táctiles grandes */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginTop: "0.75rem" }}>
                  <button
                    onClick={() => playerRef.current?.previousTrack()}
                    className="btn btn-secondary"
                    style={{ borderRadius: "50%", width: "42px", height: "42px", padding: 0 }}
                  >
                    <IconSkipBack size={18} />
                  </button>
                  <button
                    onClick={() => playerRef.current?.togglePlay()}
                    style={{
                      background: "#1ed760",
                      color: "#000000",
                      border: "none",
                      borderRadius: "50%",
                      width: "48px",
                      height: "48px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(30, 215, 96, 0.4)",
                    }}
                  >
                    {spotifyPlayerState.paused ? <IconPlay size={20} /> : <IconPause size={20} />}
                  </button>
                  <button
                    onClick={() => playerRef.current?.nextTrack()}
                    className="btn btn-secondary"
                    style={{ borderRadius: "50%", width: "42px", height: "42px", padding: 0 }}
                  >
                    <IconSkipForward size={18} />
                  </button>

                  {/* Volumen táctil */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginLeft: "1rem" }}>
                    <button
                      onClick={handleToggleMute}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--apple-text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      {isMuted || spotifyVolume === 0 ? <IconVolumeX size={18} /> : <IconVolume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : spotifyVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      style={{ width: "90px", accentColor: "#1ed760", cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Buscador / Carga rápida de Playlist o Álbum de Spotify */}
          <form
            onSubmit={handleSpotifyLoadUrl}
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <IconMusic
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  color: "#1ed760",
                }}
              />
              <input
                type="text"
                value={spotifyQuery}
                onChange={(e) => setSpotifyQuery(e.target.value)}
                placeholder="Pega cualquier enlace de playlist o álbum de Spotify..."
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem 0.65rem 2.4rem",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                borderRadius: "var(--radius-full)",
                padding: "0 1.25rem",
                background: "#1ed760",
                color: "#000000",
                border: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              Cargar
            </button>
          </form>

          {/* Reproductor Embebido Spotify (Sin fricción) */}
          <div
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "#000000",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
            }}
          >
            <iframe
              src={spotifyEmbedUrl}
              width="100%"
              height="380"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Embed Player"
              style={{ display: "block" }}
            />
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 🌐 3. PESTAÑA: NAVEGADOR GOOGLE (SIN RECOMENDACIONES, SOLO GOOGLE)*/}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "browser" && (
        <div>
          {/* Barra Superior Estilo Chrome (Omnibox, Botones de Navegación) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(0, 0, 0, 0.45)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.85rem",
            }}
          >
            {/* Controles de navegación */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button
                onClick={handleBrowserBack}
                disabled={historyIndex <= 0}
                style={{
                  background: "transparent",
                  border: "none",
                  color: historyIndex > 0 ? "#ffffff" : "rgba(255, 255, 255, 0.2)",
                  cursor: historyIndex > 0 ? "pointer" : "default",
                  padding: "0.35rem",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Atrás"
              >
                <IconArrowLeft size={16} />
              </button>
              <button
                onClick={handleBrowserForward}
                disabled={historyIndex >= browserHistory.length - 1}
                style={{
                  background: "transparent",
                  border: "none",
                  color: historyIndex < browserHistory.length - 1 ? "#ffffff" : "rgba(255, 255, 255, 0.2)",
                  cursor: historyIndex < browserHistory.length - 1 ? "pointer" : "default",
                  padding: "0.35rem",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Adelante"
              >
                <IconArrowRight size={16} />
              </button>
              <button
                onClick={handleBrowserReload}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "0.35rem",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Recargar página"
              >
                <IconRotateCw size={15} />
              </button>
              <button
                onClick={handleBrowserGoHome}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "0.3rem 0.6rem",
                  borderRadius: "var(--radius-full)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  marginLeft: "0.2rem",
                }}
                title="Volver a Google"
              >
                <span>🔍</span>
                <span>Google</span>
              </button>
            </div>

            {/* Omnibox / Barra de Búsqueda de Google */}
            <form onSubmit={handleBrowserSubmit} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--radius-full)",
                  padding: "0.4rem 0.85rem",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                <span style={{ fontSize: "0.75rem", marginRight: "0.5rem", color: "#34c759" }}>🔒</span>
                <input
                  type="text"
                  value={browserUrlInput}
                  onChange={(e) => setBrowserUrlInput(e.target.value)}
                  placeholder="Buscar en Google o escribir URL..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            </form>

            {/* Abrir en pestaña nativa del Kiosk si el usuario lo desea */}
            <button
              onClick={() => openInExternalTab(browserUrlInput)}
              className="btn btn-secondary"
              style={{
                borderRadius: "var(--radius-full)",
                fontSize: "0.75rem",
                padding: "0.4rem 0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                flexShrink: 0,
              }}
              title="Abrir en pantalla completa externa"
            >
              <IconExternalLink size={14} />
              <span>Abrir</span>
            </button>
          </div>

          {/* Visor IFrame de Google Web */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#ffffff",
              height: "560px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            }}
          >
            <iframe
              src={currentIframeUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              title="Google Kiosk Browser"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </div>
      )}

      {/* ── Modal de Configuración de Spotify Connect ── */}
      {isTokenModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "1.5rem",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
              <div
                style={{
                  background: "#1ed760",
                  color: "#000",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconMusic size={18} />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Vincular Spotify Connect</h3>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--apple-text-secondary)", lineHeight: 1.45, marginBottom: "1rem" }}>
              El Kiosk funciona con <strong>Spotify Web Playback SDK</strong>. Para registrar el dispositivo como receptor oficial
              y transferir música desde vuestros teléfonos, pega tu token de acceso OAuth de Spotify (con permiso <code>streaming</code>):
            </p>

            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Pega aquí el Token de Acceso de Spotify..."
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "12px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                marginBottom: "1rem",
                outline: "none",
                resize: "none",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a
                href="https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.75rem", color: "#1ed760", textDecoration: "none" }}
              >
                ¿Cómo obtener el token? →
              </a>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ borderRadius: "var(--radius-full)", fontSize: "0.82rem" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSpotifyToken}
                  className="btn btn-primary"
                  style={{
                    borderRadius: "var(--radius-full)",
                    background: "#1ed760",
                    color: "#000000",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    border: "none",
                  }}
                >
                  Guardar & Conectar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
