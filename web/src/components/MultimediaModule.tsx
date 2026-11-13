"use client";

import { useState, useEffect, useRef } from "react";
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
  IconRadio,
  IconBookmark,
} from "./Icons";

type MultimediaTab = "spotify" | "youtube" | "browser";

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

// Playlists familiares destacadas para el Kiosk
const SPOTIFY_FAMILY_PLAYLISTS = [
  {
    id: "37i9dQZF1DXdgnkgkP09Hg",
    title: "Peques Fabio & Bruno",
    subtitle: "Cantajuegos, Disney & Canciones Infantiles",
    emoji: "👶",
    color: "#ff9500",
  },
  {
    id: "37i9dQZF1DX4WYpdgoIcn6",
    title: "Cocina & Cenas",
    subtitle: "Acoustic chill, Bossa Nova y Pop suave",
    emoji: "🍳",
    color: "#34c759",
  },
  {
    id: "37i9dQZF1DXcBWIGoYBM5M",
    title: "Café & Mañanas",
    subtitle: "Música positiva para empezar el día",
    emoji: "☕",
    color: "#007aff",
  },
  {
    id: "37i9dQZF1DX8s9hdYrVJim",
    title: "Pop Español & Éxitos",
    subtitle: "Los mejores temas para disfrutar en casa",
    emoji: "💃",
    color: "#af52de",
  },
  {
    id: "37i9dQZF1DWZd79rJ6a7lp",
    title: "Buenas Noches & Relax",
    subtitle: "Sonidos tranquilos y melodías para dormir",
    emoji: "🌙",
    color: "#5856d6",
  },
];

// Vídeos y canales sugeridos para YouTube (modo invitado)
const YOUTUBE_CATEGORIES = [
  {
    id: "peques",
    name: "👶 Peques (Fabio & Bruno)",
    videos: [
      { id: "QZ0gqJ3-33k", title: "Pocoyó - Episodios Completos", channel: "Pocoyó Español" },
      { id: "e_04ZrNroTo", title: "La Vaca Lola y canciones de La Granja", channel: "El Reino Infantil" },
      { id: "1a8pI65emDE", title: "Cantajuego - Grandes Éxitos", channel: "CantaJuegoVEVO" },
      { id: "hT_nvWreIhg", title: "Peppa Pig en Español Latino/Castellano", channel: "Peppa Pig Español Oficial" },
    ],
  },
  {
    id: "cocina",
    name: "🍳 Cocina & Recetas",
    videos: [
      { id: "jfKfPfyJRdk", title: "Lo-Fi Hip Hop Radio - Beats to relax/study", channel: "Lofi Girl" },
      { id: "5qap5aO4i9A", title: "Bossa Nova Cafe Instrumental", channel: "Cafe Music BGM" },
      { id: "21X5lGlDOfg", title: "Recetas Fáciles y Rápidas para Cenas", channel: "Karlos Arguiñano" },
      { id: "kJQP7kiw5Fk", title: "Cocina Tradicional y Tapas", channel: "Directo al Paladar" },
    ],
  },
  {
    id: "directo",
    name: "📰 Noticias & Directos",
    videos: [
      { id: "dQw4w9WgXcQ", title: "RTVE Noticias 24 Horas Directo", channel: "RTVE Noticias" },
      { id: "live_salamanca", title: "Cámaras en Directo Plaza Mayor Salamanca", channel: "Salamanca RTV" },
    ],
  },
];

// Marcadores rápidos estilo Chrome para el Kiosk
const CHROME_BOOKMARKS = [
  { name: "Google", url: "https://www.google.com/webhp?igu=1", icon: "🔍", canEmbed: true },
  { name: "Wikipedia", url: "https://es.m.wikipedia.org", icon: "📚", canEmbed: true },
  { name: "AEMET Tiempo", url: "https://www.aemet.es", icon: "🌦️", canEmbed: false },
  { name: "La Gaceta Salamanca", url: "https://www.lagacetadesalamanca.es", icon: "📰", canEmbed: false },
  { name: "Col. Montessori", url: "https://www.colegiomontessorisalamanca.com", icon: "🏫", canEmbed: false },
  { name: "Directo al Paladar", url: "https://www.directoalpaladar.com", icon: "🍳", canEmbed: false },
  { name: "Mercadona", url: "https://tienda.mercadona.es", icon: "🛒", canEmbed: false },
  { name: "Home Assistant", url: "http://homeassistant.local:8123", icon: "🏠", canEmbed: false },
];

export function MultimediaModule() {
  const [activeTab, setActiveTab] = useState<MultimediaTab>("spotify");

  // ── ESTADOS DE SPOTIFY CONNECT ──
  const [spotifyToken, setSpotifyToken] = useState<string>("");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyPlayerState, setSpotifyPlayerState] = useState<any>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("37i9dQZF1DXdgnkgkP09Hg");
  const [spotifyVolume, setSpotifyVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);

  // ── ESTADOS DE YOUTUBE ──
  const [youtubeQuery, setYoutubeQuery] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState<string>("5qap5aO4i9A"); // Bossa Nova Cafe por defecto
  const [activeYoutubeCategory, setActiveYoutubeCategory] = useState<string>("peques");

  // ── ESTADOS DEL NAVEGADOR CHROME ──
  const [browserUrlInput, setBrowserUrlInput] = useState("https://es.m.wikipedia.org");
  const [currentIframeUrl, setCurrentIframeUrl] = useState("https://es.m.wikipedia.org");
  const [browserHistory, setBrowserHistory] = useState<string[]>(["https://es.m.wikipedia.org"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoadingBrowser, setIsLoadingBrowser] = useState(false);
  const [browserIframeBlocked, setBrowserIframeBlocked] = useState(false);

  // Cargar token guardado de Spotify
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kiosk_spotify_token");
      if (saved) {
        setSpotifyToken(saved);
        setTokenInput(saved);
      }
    }
  }, []);

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
          console.warn("[Spotify Connect] Error de autenticación (token caducado):", message);
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

  // Manejar búsqueda de YouTube
  const handleYoutubeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeQuery.trim()) return;

    const query = youtubeQuery.trim();
    // Si pegan una URL de youtube directa
    const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (urlMatch && urlMatch[1]) {
      setCurrentVideoId(urlMatch[1]);
      setYoutubeQuery("");
      return;
    }

    // Si es una búsqueda de texto, usamos la búsqueda embebida de YouTube
    setCurrentVideoId("");
  };

  // Navegación estilo Chrome
  const navigateTo = (rawUrl: string) => {
    let url = rawUrl.trim();
    if (!url) return;

    // Si no tiene protocolo y parece dominio
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (url.includes(".") && !url.includes(" ")) {
        url = "https://" + url;
      } else {
        // Búsqueda en DuckDuckGo / Google
        url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
      }
    }

    setBrowserUrlInput(url);
    setCurrentIframeUrl(url);
    setIsLoadingBrowser(true);
    setBrowserIframeBlocked(false);

    // Actualizar historial
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
      setBrowserIframeBlocked(false);
    }
  };

  const handleBrowserForward = () => {
    if (historyIndex < browserHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const url = browserHistory[nextIdx];
      setBrowserUrlInput(url);
      setCurrentIframeUrl(url);
      setBrowserIframeBlocked(false);
    }
  };

  const handleBrowserReload = () => {
    setIsLoadingBrowser(true);
    const curr = currentIframeUrl;
    setCurrentIframeUrl("");
    setTimeout(() => {
      setCurrentIframeUrl(curr);
    }, 50);
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
                activeTab === "spotify"
                  ? "rgba(30, 215, 96, 0.15)"
                  : activeTab === "youtube"
                  ? "rgba(255, 0, 0, 0.15)"
                  : "rgba(0, 122, 255, 0.15)",
              color:
                activeTab === "spotify"
                  ? "#1ed760"
                  : activeTab === "youtube"
                  ? "#ff3b30"
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
            {activeTab === "spotify" ? (
              <IconMusic size={20} />
            ) : activeTab === "youtube" ? (
              <IconTv size={20} />
            ) : (
              <IconGlobe size={20} />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Centro Multimedia & Web Kiosk
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Spotify Connect · YouTube en modo invitado · Navegador Web Chrome
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
            Chrome Web
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 🎵 1. PESTAÑA: SPOTIFY CONNECT & WEB PLAYBACK SDK                */}
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
                    ? "Puedes enviar música directamente desde la app de Spotify en tu móvil tocando el icono de altavoz"
                    : "Selecciona una playlist familiar abajo o vincula tu cuenta para usar Spotify Connect"}
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

          {/* Selector de Playlists Familiares de 1 Toque */}
          <div style={{ marginBottom: "1rem" }}>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--apple-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: "0.6rem",
              }}
            >
              Listas de Reproducción Rápidas
            </span>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.65rem",
                marginBottom: "1rem",
              }}
            >
              {SPOTIFY_FAMILY_PLAYLISTS.map((pl) => {
                const isSelected = selectedPlaylistId === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => setSelectedPlaylistId(pl.id)}
                    style={{
                      background: isSelected ? "rgba(30, 215, 96, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${isSelected ? "#1ed760" : "rgba(255, 255, 255, 0.1)"}`,
                      borderRadius: "14px",
                      padding: "0.75rem",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>{pl.emoji}</span>
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: isSelected ? "#1ed760" : "#ffffff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {pl.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--apple-text-secondary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {pl.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reproductor Embebido Spotify (Garantiza reproducción inmediata sin fricción) */}
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
              src={`https://open.spotify.com/embed/playlist/${selectedPlaylistId}?utm_source=generator&theme=0`}
              width="100%"
              height="352"
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
      {/* 🎥 2. PESTAÑA: YOUTUBE (CUENTA DE INVITADO)                       */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "youtube" && (
        <div>
          {/* Buscador de YouTube para Kiosk */}
          <form
            onSubmit={handleYoutubeSearch}
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
              <IconSearch
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  color: "var(--apple-text-secondary)",
                }}
              />
              <input
                type="text"
                value={youtubeQuery}
                onChange={(e) => setYoutubeQuery(e.target.value)}
                placeholder="Buscar en YouTube o pegar enlace (ej: Pocoyo, canciones infantiles, recetas...)"
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
                background: "#ff3b30",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              Buscar
            </button>
          </form>

          {/* Categorías Rápidas Infantiles y Familiares */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {YOUTUBE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveYoutubeCategory(cat.id)}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "var(--radius-full)",
                  border: `1px solid ${
                    activeYoutubeCategory === cat.id ? "#ff3b30" : "rgba(255, 255, 255, 0.12)"
                  }`,
                  background: activeYoutubeCategory === cat.id ? "rgba(255, 59, 48, 0.18)" : "rgba(255, 255, 255, 0.05)",
                  color: activeYoutubeCategory === cat.id ? "#ff3b30" : "var(--apple-text-secondary)",
                  fontSize: "0.8rem",
                  fontWeight: activeYoutubeCategory === cat.id ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Canales y vídeos de la categoría activa */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.6rem",
              marginBottom: "1rem",
            }}
          >
            {YOUTUBE_CATEGORIES.find((c) => c.id === activeYoutubeCategory)?.videos.map((vid) => (
              <button
                key={vid.id}
                onClick={() => setCurrentVideoId(vid.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "12px",
                  background: currentVideoId === vid.id ? "rgba(255, 59, 48, 0.15)" : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${
                    currentVideoId === vid.id ? "#ff3b30" : "rgba(255, 255, 255, 0.08)"
                  }`,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "1.2rem", color: "#ff3b30" }}>▶</span>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {vid.title}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--apple-text-secondary)" }}>{vid.channel}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Reproductor Embebido de YouTube */}
          <div
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#000000",
              aspectRatio: "16 / 9",
              width: "100%",
              maxHeight: "440px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            }}
          >
            {currentVideoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1`}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="YouTube Video Player"
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--apple-text-secondary)",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <IconSearch size={32} />
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  Buscando en YouTube... Puedes seleccionar un vídeo de arriba o abrir la búsqueda completa.
                </p>
                <button
                  onClick={() =>
                    openInExternalTab(`https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery)}`)
                  }
                  className="btn btn-secondary"
                  style={{ borderRadius: "var(--radius-full)" }}
                >
                  <IconExternalLink size={15} style={{ marginRight: "0.3rem" }} />
                  Abrir resultados en YouTube
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* 🌐 3. PESTAÑA: NAVEGADOR WEB ESTILO CHROME                        */}
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
              marginBottom: "0.75rem",
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
            </div>

            {/* Omnibox / Barra de Direcciones estilo Chrome */}
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
                  placeholder="Escribe una dirección web o busca en Google..."
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

            {/* Abrir en pestaña nativa del Kiosk */}
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
              title="Abrir en pantalla completa o pestaña externa"
            >
              <IconExternalLink size={14} />
              <span>Abrir</span>
            </button>
          </div>

          {/* Marcadores Rápidos Familiares (1 toque para navegar) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              overflowX: "auto",
              paddingBottom: "0.6rem",
              marginBottom: "0.6rem",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", marginRight: "0.3rem" }}>
              ⭐ Favoritos:
            </span>
            {CHROME_BOOKMARKS.map((bm) => (
              <button
                key={bm.name}
                onClick={() => {
                  if (bm.canEmbed) {
                    navigateTo(bm.url);
                  } else {
                    openInExternalTab(bm.url);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <span>{bm.icon}</span>
                <span>{bm.name}</span>
                {!bm.canEmbed && <IconExternalLink size={11} style={{ opacity: 0.6 }} />}
              </button>
            ))}
          </div>

          {/* Visor IFrame Web */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#ffffff",
              height: "540px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Aviso informativo de seguridad de navegación embebida */}
            {browserIframeBlocked && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(18, 18, 18, 0.95)",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem",
                  textAlign: "center",
                  zIndex: 10,
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.8rem" }}>🛡️</div>
                <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>Protección de seguridad del sitio web</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--apple-text-secondary)", maxWidth: "480px" }}>
                  Por políticas de seguridad (X-Frame-Options), algunas webs como Google o periódicos impiden cargarse
                  dentro de otra aplicación. Puedes abrirla inmediatamente a pantalla completa con un toque:
                </p>
                <button
                  onClick={() => openInExternalTab(currentIframeUrl)}
                  className="btn btn-primary"
                  style={{
                    marginTop: "1rem",
                    borderRadius: "var(--radius-full)",
                    padding: "0.6rem 1.4rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <IconExternalLink size={16} />
                  Abrir en el Navegador del Kiosk
                </button>
              </div>
            )}

            <iframe
              src={currentIframeUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              title="Chrome Kiosk Browser"
              onError={() => setBrowserIframeBlocked(true)}
              onLoad={() => setIsLoadingBrowser(false)}
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
