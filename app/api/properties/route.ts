import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

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

  const files = formData.getAll("images") as File[];
  const imageUrls: string[] = [];
  for (const f of files) {
    if (f && f.size > 0) {
      const ext = f.name.split(".").pop() || "jpg";
      const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const arrayBuffer = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { error: uploadError } = await supabase.storage.from("property-images").upload(fileName, buffer, { contentType: f.type, upsert: false });
      if (!uploadError) { const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(fileName); imageUrls.push(urlData.publicUrl); }
    }
  }
  const mainImage = imageUrls[0] || "";
  const { data, error } = await supabase.from("properties").insert({ title, price, rooms, address, city, building_type: buildingType, complex_name: complexName, year_built: yearBuilt, area, bathroom, ceiling_height: ceilingHeight, description, image_url: mainImage, image_urls: imageUrls }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
