import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "Нет файлов" }, { status: 400 });

  const uploaded: { name: string; url: string }[] = [];
  for (const f of files) {
    if (!f || f.size === 0) continue;
    const ext = f.name.split(".").pop() || "bin";
    const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const arrayBuffer = await f.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { error: uploadError } = await supabase.storage
      .from("deal-documents")
      .upload(fileName, buffer, { contentType: f.type, upsert: false });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("deal-documents").getPublicUrl(fileName);
      uploaded.push({ name: f.name, url: urlData.publicUrl });
    }
  }

  return NextResponse.json({ files: uploaded });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();
  const filePath = body.path as string;
  if (!filePath) return NextResponse.json({ error: "Нет пути" }, { status: 400 });

  const { error } = await supabase.storage.from("deal-documents").remove([filePath]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
