import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateUploadFile, isOwnedStorageName } from "@/lib/upload-guard";

const BUCKET = "attachments";

function fileNameFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split("/").pop() || "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "Нет файлов" }, { status: 400 });

  const uploaded: { name: string; url: string; size: number }[] = [];
  for (const f of files) {
    const invalid = validateUploadFile(f);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const ext = f.name.split(".").pop() || "bin";
    const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const arrayBuffer = await f.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: f.type || "application/octet-stream", upsert: false });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      uploaded.push({ name: f.name, url: urlData.publicUrl, size: f.size });
    }
  }

  return NextResponse.json({ files: uploaded });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const path = fileNameFromUrl(String(body.url || ""));
  if (!path) return NextResponse.json({ error: "Нет пути" }, { status: 400 });
  // Удалять можно только собственные вложения — публичная ссылка на чужой файл
  // больше не является пропуском.
  if (!isOwnedStorageName(user.id, path)) {
    return NextResponse.json({ error: "Можно удалять только свои файлы" }, { status: 403 });
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}