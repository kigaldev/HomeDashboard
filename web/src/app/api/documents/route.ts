import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DOCUMENTS_DIR = path.join(process.cwd(), "public", "documents");

async function ensureDir() {
  try {
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
  } catch {}
}

export async function POST(req: Request) {
  await ensureDir();
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo válido" },
        { status: 400 }
      );
    }

    const blob = file as Blob;
    // Límite de 15 MB para pólizas PDF o fotos de tickets en alta resolución
    if (blob.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo supera el tamaño máximo permitido de 15 MB" },
        { status: 413 }
      );
    }

    const rawName = (file as { name?: string }).name || "documento.pdf";
    const ext = path.extname(rawName).toLowerCase();
    const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"];

    if (!validExts.includes(ext)) {
      return NextResponse.json(
        { error: "Formato no permitido. Solo se aceptan PDF o imágenes (JPG, PNG, WEBP, HEIC)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const cleanBase = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const filename = `doc_${timestamp}_${cleanBase}${ext}`;
    const targetPath = path.join(DOCUMENTS_DIR, filename);

    await fs.writeFile(targetPath, buffer);

    const publicUrl = `/documents/${filename}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: blob.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al guardar el documento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
