// Ссылки на внутренние вложения (deal-documents, attachments) идут через
// /api/files/view: бакеты приватные, API проверяет сессию и отдаёт
// короткоживущую подписанную ссылку на Storage. Прямые публичные URL в БД
// остаются идентификатором файла, но перестают открывать файл без логина.
export function fileViewHref(url: string): string {
  return "/api/files/view?url=" + encodeURIComponent(url);
}
