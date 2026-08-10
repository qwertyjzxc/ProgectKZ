import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { id } = await params;
  const formData = await request.formData();
  const title = formData.get("title")?.toString() || "";
  const price = parseFloat(formData.get("price")?.toString() || "0");
  const rooms = parseInt(formData.get("rooms")?.toString() || "0") || null;
  const address = formData.get("address")?.toString() || "";
  const city = formData.get("city")?.toString() || "";
  const buildingType = formData.get("building_type")?.toString() || "";
  const complexName = formData.get("complex_name")?.toString() || "";
  const yearBuilt = parseInt(formData.get("year_built")?.toString() || "0") || null;
  const area = parseFloat(formData.get("area")?.toString() || "0") || null;
  const bathroom = formData.get("bathroom")?.toString() || "";
  const ceilingHeight = parseFloat(formData.get("ceiling_height")?.toString() || "0") || null;
  const description = formData.get("description")?.toString() || "";
  const status = formData.get("status")?.toString() || "Активно";
  const files = formData.getAll("images") as File[];
  const newUrls: string[] = [];
  for (const f of files) {
    if (f && f.size > 0) {
      const ext = f.name.split(".").pop() || "jpg";
      const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const aBuf = await f.arrayBuffer();
      const { error: ue } = await supabase.storage.from("property-images").upload(fileName, Buffer.from(aBuf), { contentType: f.type, upsert: false });
      if (!ue) { const { data: ud } = supabase.storage.from("property-images").getPublicUrl(fileName); newUrls.push(ud.publicUrl); }
    }
  }
  const updateData: Record<string, any> = { title, price, rooms, address, city, building_type: buildingType, complex_name: complexName, year_built: yearBuilt, area, bathroom, ceiling_height: ceilingHeight, description, status };
  if (newUrls.length > 0) { updateData.image_url = newUrls[0]; updateData.image_urls = newUrls; }
  const { data, error } = await supabase.from("properties").update(updateData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { id } = await params;
  const { data: property } = await supabase.from("properties").select("image_url").eq("id", id).single();
  if (property?.image_url) { const url = new URL(property.image_url); const parts = url.pathname.split("/"); const fn = parts[parts.length - 1]; if (fn) await supabase.storage.from("property-images").remove([fn]); }
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
