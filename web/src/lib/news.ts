import "server-only";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDate: string;
  timeAgo: string;
  region: "espana" | "cyl";
};

// Cache en memoria para 10 minutos
let cachedEspana: { timestamp: number; items: NewsItem[] } | null = null;
let cachedCyL: { timestamp: number; items: NewsItem[] } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

function formatTimeAgo(pubDateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(pubDateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `hace ${Math.max(1, diffMins)} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;
    return `hace ${Math.floor(diffHours / 24)} d`;
  } catch {
    return "";
  }
}

function parseRssXml(xml: string, region: "espana" | "cyl"): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (let i = 0; i < Math.min(itemMatches.length, 6); i++) {
    const raw = itemMatches[i];
    const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = raw.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = raw.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    let fullTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() : "";
    let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() : "";
    const link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() : "#";
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";

    // Si el título termina en " - Fuente", separar limpiamente
    if (!source && fullTitle.includes(" - ")) {
      const parts = fullTitle.split(" - ");
      source = parts.pop() || "";
      fullTitle = parts.join(" - ");
    } else if (fullTitle.includes(` - ${source}`)) {
      fullTitle = fullTitle.replace(` - ${source}`, "").trim();
    }

    // Decodificar entidades HTML básicas
    fullTitle = fullTitle
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    items.push({
      id: `${region}-${i}-${pubDate}`,
      title: fullTitle,
      source: source || (region === "cyl" ? "Castilla y León" : "España"),
      link,
      pubDate,
      timeAgo: formatTimeAgo(pubDate),
      region,
    });
  }

  return items;
}

export async function getLatestNews(): Promise<{ espana: NewsItem[]; cyl: NewsItem[] }> {
  const now = Date.now();

  let espana = cachedEspana && now - cachedEspana.timestamp < CACHE_TTL_MS ? cachedEspana.items : null;
  let cyl = cachedCyL && now - cachedCyL.timestamp < CACHE_TTL_MS ? cachedCyL.items : null;

  try {
    if (!espana) {
      const res = await fetch("https://news.google.com/rss?hl=es&gl=ES&ceid=ES:es", {
        headers: { "user-agent": "Mozilla/5.0 (HomeDashboard; +https://homedashboard.local)" },
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const xml = await res.text();
        espana = parseRssXml(xml, "espana");
        cachedEspana = { timestamp: now, items: espana };
      }
    }
  } catch (err) {
    console.warn("[news] Error fetching España news:", err);
  }

  try {
    if (!cyl) {
      const res = await fetch(
        "https://news.google.com/rss/search?q=Castilla+y+Leon&hl=es&gl=ES&ceid=ES:es",
        {
          headers: { "user-agent": "Mozilla/5.0 (HomeDashboard; +https://homedashboard.local)" },
          next: { revalidate: 600 },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.ok) {
        const xml = await res.text();
        cyl = parseRssXml(xml, "cyl");
        cachedCyL = { timestamp: now, items: cyl };
      }
    }
  } catch (err) {
    console.warn("[news] Error fetching Castilla y León news:", err);
  }

  // Fallbacks si la red falla
  const fallbackEspana: NewsItem[] = [
    {
      id: "fallback-es-1",
      title: "Actualidad nacional y previsión meteorológica",
      source: "RNE / RTVE",
      link: "https://www.rtve.es/noticias/",
      pubDate: new Date().toISOString(),
      timeAgo: "reciente",
      region: "espana",
    },
  ];

  const fallbackCyL: NewsItem[] = [
    {
      id: "fallback-cyl-1",
      title: "Boletín informativo y novedades de Salamanca y Castilla y León",
      source: "Junta de Castilla y León",
      link: "https://comunicacion.jcyl.es/",
      pubDate: new Date().toISOString(),
      timeAgo: "reciente",
      region: "cyl",
    },
  ];

  return {
    espana: espana && espana.length > 0 ? espana : fallbackEspana,
    cyl: cyl && cyl.length > 0 ? cyl : fallbackCyL,
  };
}

