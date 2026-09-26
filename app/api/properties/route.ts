import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAll, getActorUserId } from "@/lib/notify";
import { propertyListLink } from "@/lib/notify-links";
import { toWebp } from "@/lib/image-convert";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // Защита от выгрузки всей таблицы целиком при росте данных
  const limit = Math.min(1000, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "1000", 10) || 1000));
  const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "Нет id для удаления" }, { status: 400 });

  const { data: properties } = await supabase.from("properties").select("image_url").in("id", ids);
  if (properties) {
    for (const p of properties) {
      if (p.image_url) {
        try {
          const url = new URL(p.image_url);
          const fn = url.pathname.split("/").pop();
          if (fn) await supabase.storage.from("property-images").remove([fn]);
        } catch {}
      }
    }
  }
  const { error } = await supabase.from("properties").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  after(async () => {
    const actorUserId = await getActorUserId(supabase);
    await notifyAll({
      key: "objects_delete",
      message: ids.length === 1 ? "Удалён объект" : `Удалено объектов: ${ids.length}`,
      related_to: "/dashboard/ours",
      actorUserId,
    });
  });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const formData = await request.formData();
  const title = formData.get("title")?.toString() || "";
  const price = parseFloat(formData.get("price")?.toString() || "0");
  const propertyType = formData.get("property_type")?.toString() || "";
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
  const contractNumber = formData.get("contract_number")?.toString() || "";
  const paymentMethod = formData.get("payment_method")?.toString() || "";
  const contacts = formData.get("contacts")?.toString() || "";

  const files = formData.getAll("images") as File[];
  const imageUrls: string[] = [];
  for (const f of files) {
    if (f && f.size > 0) {
      const arrayBuffer = await f.arrayBuffer();
      // Фото жмём в WebP один раз здесь, а не при каждом просмотре
      const converted = await toWebp(Buffer.from(arrayBuffer));
      const ext = converted.ext || f.name.split(".").pop() || "jpg";
      const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("property-images").upload(fileName, converted.buffer, { contentType: converted.contentType || f.type, upsert: false });
      if (!uploadError) { const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(fileName); imageUrls.push(urlData.publicUrl); }
    }
  }
  const mainImage = imageUrls[0] || "";
  const { data, error } = await supabase.from("properties").insert({ title, price, property_type: propertyType, rooms, address, city, building_type: buildingType, complex_name: complexName, year_built: yearBuilt, area, bathroom, ceiling_height: ceilingHeight, description, status, contract_number: contractNumber, payment_method: paymentMethod, contacts, image_url: mainImage, image_urls: imageUrls }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const created = data;
    const link = propertyListLink(data.id);
    after(async () => {
      const actorUserId = await getActorUserId(supabase);
      await notifyAll({
        key: "objects_create",
        message: "Новый объект: «" + (created.title || "") + "»",
        related_to: link,
        // id объекта — UUID, в related_id (int) не влезает
        related_id: null,
        actorUserId,
      });
    });
    return NextResponse.json(data, { status: 201 });
}
