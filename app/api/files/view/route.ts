import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { requireUser } from "@/lib/route-auth";

// Резолвер ссылок на приватные вложения: /api/files/view?url=<storage-url>.
// Проверяет сессию (и админа для документов сделок), затем редиректит на
// подписанный URL Storage со сроком жизни 1 час.
const PRIVATE_BUCKETS = ["deal-documents", "attachments"];
const SIGNED_URL_TTL_S = 3600;

export async function GET(request: NextRequest) {
  const gate = await requireUser();
  if (gate.denied) return gate.denied;

  const raw = request.nextUrl.searchParams.get("url") || "";
  if (!raw) return NextResponse.json({ error: "Нет ссылки на файл" }, { status: 400 });

  // .../storage/v1/object/[public/]<bucket>/<name> — иначе это не Storage-URL
  let bucket = "";
  let name = "";
  try {
    const m = new URL(raw).pathname.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/);
    if (!m) return NextResponse.json({ error: "Ссылка не похожа на файл Storage" }, { status: 400 });
    bucket = decodeURIComponent(m[1]);
    name = decodeURIComponent(m[2]);
  } catch {
    return NextResponse.json({ error: "Некорректная ссылка" }, { status: 400 });
  }
  if (!PRIVATE_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: "Бакет не обслуживается" }, { status: 400 });
  }
  // Документы сделок — ветка админов (сделки в CRM видят только админы)
  if (bucket === "deal-documents" && !(await isAdminUser(gate.user.id))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(name, SIGNED_URL_TTL_S);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Файл не найден" }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
