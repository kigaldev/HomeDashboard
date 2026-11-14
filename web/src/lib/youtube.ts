export type YoutubeSearchResult = {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration?: string;
};

/**
 * Busca vídeos en YouTube de forma pública sin requerir API key ni login.
 */
export async function searchYoutubeVideos(query: string): Promise<YoutubeSearchResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  // 1. Si el usuario introdujo una URL directa de YouTube
  const urlMatch = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (urlMatch && urlMatch[1]) {
    const videoId = urlMatch[1];
    return [
      {
        id: videoId,
        title: `Vídeo de YouTube (${videoId})`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channel: "YouTube",
        duration: "",
      },
    ];
  }

  // 2. Si el usuario introdujo directamente un ID de 11 caracteres
  if (/^[\w-]{11}$/.test(clean)) {
    return [
      {
        id: clean,
        title: `Vídeo (${clean})`,
        thumbnail: `https://i.ytimg.com/vi/${clean}/hqdefault.jpg`,
        channel: "YouTube",
        duration: "",
      },
    ];
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}&hl=es`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      next: { revalidate: 300 }, // Cache 5 min
    });

    if (!res.ok) {
      console.warn(`[youtube] Error buscando "${clean}": status ${res.status}`);
      return [];
    }

    const html = await res.text();
    const match = html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
    if (!match || !match[1]) {
      // Fallback por regex si la estructura de ytInitialData cambia
      const idMatches = Array.from(new Set(Array.from(html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)).map((m) => m[1])));
      return idMatches.slice(0, 10).map((id) => ({
        id,
        title: `Vídeo resultado (${id})`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        channel: "YouTube",
      }));
    }

    const data = JSON.parse(match[1]);
    const sectionContents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const results: YoutubeSearchResult[] = [];

    for (const section of sectionContents) {
      const itemContents = section.itemSectionRenderer?.contents || [];
      for (const item of itemContents) {
        const vr = item.videoRenderer;
        if (!vr || !vr.videoId) continue;

        const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || "Vídeo de YouTube";
        const thumbList = vr.thumbnail?.thumbnails || [];
        const thumbnail =
          thumbList[thumbList.length - 1]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
        const channel =
          vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || "Canal de YouTube";
        const duration = vr.lengthText?.simpleText || "";

        results.push({
          id: vr.videoId,
          title,
          thumbnail,
          channel,
          duration,
        });

        if (results.length >= 24) break;
      }
      if (results.length >= 24) break;
    }

    return results;
  } catch (err) {
    console.error("[youtube] Error en búsqueda:", err);
    return [];
  }
}
