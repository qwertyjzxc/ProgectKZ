export interface WebpResult {
  buffer: Buffer;
  ext: string;
  contentType: string;
}

// Конвертация загружаемых фото в WebP один раз при загрузке:
// в сторедже лежит лёгкий файл, при просмотре не нужен пересчёт.
// sharp грузим лениво: если нативного биндинга нет в рантайме,
// роут не должен падать — вернём оригинал как есть.
// Форматы, которые sharp не читает (напр. HEIC), тоже грузим как есть.
export async function toWebp(input: Buffer): Promise<WebpResult> {
  try {
    const { default: sharp } = await import("sharp");
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
