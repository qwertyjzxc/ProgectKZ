// Единый гард загрузки файлов: лимит размера и отсечение активного контента.
// Используется и на сервере (app/api/upload, app/api/deals/upload), и на клиенте
// (FileUploader) — чтобы не отправлять заведомо невалидный файл.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 МБ на файл
export const MAX_UPLOAD_MB = 10;

const BLOCKED_EXT = new Set([
  "exe", "bat", "cmd", "com", "msi", "dll", "scr", "sh", "ps1", "psm1",
  "js", "mjs", "html", "htm", "svg", "php", "py", "jar", "apk", "lnk", "vbs",
]);

const BLOCKED_MIME_PREFIXES = ["text/html", "application/x-sh", "application/x-msdownload", "application/vnd.microsoft.portable-executable"];

export function validateUploadFile(f: File): string | null {
  if (!f || f.size === 0) return "Файл пустой";
  if (f.size > MAX_UPLOAD_BYTES) return `Файл «${f.name}» больше ${MAX_UPLOAD_MB} МБ`;
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (BLOCKED_EXT.has(ext)) return `Тип файла «.${ext}» запрещён`;
  const mime = (f.type || "").split(";")[0].trim().toLowerCase();
  if (mime && BLOCKED_MIME_PREFIXES.some(p => mime.startsWith(p))) return `Тип файла «${mime}» запрещён`;
  return null;
}

// Имя файла в хранилище всегда `${userId}_<timestamp>_<rand>.<ext>`.
// Проверка на DELETE не даёт удалять чужие вложения, зная публичный URL.
export function isOwnedStorageName(userId: string, pathOrUrl: string): boolean {
  const raw = String(pathOrUrl || "");
  let name = raw;
  try {
    name = new URL(raw, "https://x.supabase.co").pathname.split("/").pop() || "";
  } catch {
    name = raw.split("/").pop() || "";
  }
  return name.startsWith(userId + "_");
}