import { describe, it, expect, vi } from "vitest";
import { searchYoutubeVideos } from "./youtube";

describe("searchYoutubeVideos", () => {
  it("devuelve array vacío si la consulta está vacía", async () => {
    const res = await searchYoutubeVideos("   ");
    expect(res).toEqual([]);
  });

  it("extrae directamente el ID si se proporciona una URL de YouTube", async () => {
    const res = await searchYoutubeVideos("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("dQw4w9WgXcQ");
    expect(res[0].thumbnail).toContain("dQw4w9WgXcQ");
  });

  it("extrae directamente el ID si se proporciona una URL de youtu.be", async () => {
    const res = await searchYoutubeVideos("https://youtu.be/5qap5aO4i9A");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("5qap5aO4i9A");
  });

  it("reconoce un ID de 11 caracteres", async () => {
    const res = await searchYoutubeVideos("5qap5aO4i9A");
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("5qap5aO4i9A");
  });
});
