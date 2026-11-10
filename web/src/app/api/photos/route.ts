import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");

// Asegurar que existe el directorio
async function ensureDir() {
  try {
    await fs.mkdir(PHOTOS_DIR, { recursive: true });
  } catch {}
}

export async function GET() {
  await ensureDir();
  try {
    const files = await fs.readdir(PHOTOS_DIR);
    const validExts = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif"];
    const photoFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return validExts.includes(ext) && !f.startsWith(".");
    });

    // Colocar familia-feliz-gallego.jpg al principio si existe
    photoFiles.sort((a, b) => {
      if (a.includes("familia-feliz-gallego")) return -1;
      if (b.includes("familia-feliz-gallego")) return 1;
      return a.localeCompare(b);
    });

    const photos = photoFiles.map((file) => `/photos/${file}`);
    return NextResponse.json({ photos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing photos";
    return NextResponse.json({ error: message, photos: ["/photos/familia-feliz-gallego.jpg"] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureDir();
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No se proporcionó ningún archivo de imagen válido" }, { status: 400 });
    }

    const blob = file as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitizar nombre de archivo
    const rawName = (file as { name?: string }).name || "foto.jpg";
    const ext = path.extname(rawName).toLowerCase() || ".jpg";
    const timestamp = Date.now();
    const cleanBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${timestamp}_${cleanBase}${ext}`;
    const targetPath = path.join(PHOTOS_DIR, filename);

    await fs.writeFile(targetPath, buffer);

    const publicUrl = `/photos/${filename}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al guardar foto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
