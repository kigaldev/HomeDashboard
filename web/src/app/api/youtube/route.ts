import { NextResponse } from "next/server";
import { searchYoutubeVideos } from "@/lib/youtube";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchYoutubeVideos(q);
  return NextResponse.json({ results });
}
