import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Dashboard · Asistente",
    short_name: "Hogar",
    description: "Dashboard familiar y asistente inteligente para nuestro día a día.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone", "window-controls-overlay"],
    orientation: "landscape-primary",
    background_color: "#0c0e14",
    theme_color: "#1e2230",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
