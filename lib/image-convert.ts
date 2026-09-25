import sharp from "sharp";

// Конвертация загружаемых фото в WebP один раз при загрузке:
// в сторедже лежит лёгкий файл, при просмотре не нужен пересчёт.
// Форматы, которые sharp не читает (напр. HEIC), возвращаем как есть.
export async function toWebp(input: Buffer): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  try {
    const out = await sharp(input)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: out, ext: "webp", contentType: "image/webp" };
  } catch {
    return { buffer: input, ext: "", contentType: "" };
  }
}
