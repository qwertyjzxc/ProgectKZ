import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { isAdminUser } from "@/lib/admin";
import { getPhoneVisibility, canSeePhone } from "@/lib/phone-visibility";
import { unauthorized } from "@/lib/route-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SearchHit {
  kind: string;
  title: string;
  subtitle: string;
  href: string;
}

async function safeQuery(
  supabase: SupabaseClient,
  table: string,
  cols: string,
  q: string,
  fields: string[],
  map: (row: Record<string, unknown>) => SearchHit
): Promise<SearchHit[]> {
  try {
    const ors = fields.map(f => `${f}.ilike.%${q}%`).join(",");
    const { data, error } = await supabase.from(table).select(cols).or(ors).limit(5);
    if (error || !data) return [];
    return (data as unknown as Record<string, unknown>[]).map(map);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get("q") || "").trim().replace(/[%_,]/g, "");
  if (raw.length < 2) return NextResponse.json([]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Без сессии поиск не работает вовсе: раньше отдавал клиентов (с телефонами
  // в подсказках) всем подряд — это обход маскировки из phone-visibility.
  if (!user) return unauthorized();
  const isAdmin = await isAdminUser(user.id);
  // Телефон в подсказке показываем только если его вообще можно видеть
  // (админ или брокер клиента) — иначе пустая строка.
  const vis = await getPhoneVisibility();
  const phoneOr = (phone: unknown, broker: unknown) =>
    canSeePhone(typeof broker === "string" ? broker : undefined, vis)
      ? String(phone || "")
      : "";

  // Клиентские таблицы — через service-клиент: колонка phone закрыта для роли
  // authenticated (RLS v2), а подсказка должна показывать телефон владельцу
  // клиента/админу (маска phoneOr ниже решает, кому).
  const [clientsA, clientsP, dealsK, dealsP, dealsZ, tasks, props] = await Promise.all([
    safeQuery(serviceClient, "clients_arenda", "id,name,phone,address,broker", raw, ["name", "phone", "address"], r => ({
      kind: "Клиент", title: String(r.name || "—"), subtitle: [phoneOr(r.phone, r.broker), r.address].filter(Boolean).join(" · ") + " · Аренда",
      href: "/clients",
    })),
    safeQuery(serviceClient, "clients_prodaja", "id,name,phone,address,broker", raw, ["name", "phone", "address"], r => ({
      kind: "Клиент", title: String(r.name || "—"), subtitle: [phoneOr(r.phone, r.broker), r.address].filter(Boolean).join(" · ") + " · Покупка",
      href: "/clients/sell",
    })),
    ...(isAdmin ? [
    safeQuery(supabase, "deals_kvartiry", "id,name,client,phone,amount,category", raw, ["name", "client", "phone"], r => ({
      kind: "Сделка", title: String(r.name || r.client || "—"), subtitle: [r.phone, r.amount ? Number(r.amount).toLocaleString("ru-RU") + " ₸" : ""].filter(Boolean).join(" · ") + " · Квартиры",
      href: "/deals?category=" + (r.category === "pokupka" || r.category === "prodaja" ? "pokupka" : "arenda") + "&type=kvartiry&view=" + r.id,
    })),
    safeQuery(supabase, "deals_pomescheniya", "id,name,client,phone,amount,category", raw, ["name", "client", "phone"], r => ({
      kind: "Сделка", title: String(r.name || r.client || "—"), subtitle: [r.phone, r.amount ? Number(r.amount).toLocaleString("ru-RU") + " ₸" : ""].filter(Boolean).join(" · ") + " · Помещения",
      href: "/deals?category=" + (r.category === "pokupka" || r.category === "prodaja" ? "pokupka" : "arenda") + "&type=pomescheniya&view=" + r.id,
    })),
    safeQuery(supabase, "deals_zemlya", "id,name,client,phone,amount,category", raw, ["name", "client", "phone"], r => ({
      kind: "Сделка", title: String(r.name || r.client || "—"), subtitle: [r.phone, r.amount ? Number(r.amount).toLocaleString("ru-RU") + " ₸" : ""].filter(Boolean).join(" · ") + " · Земля",
      href: "/deals?category=" + (r.category === "pokupka" || r.category === "prodaja" ? "pokupka" : "arenda") + "&type=zemlya&view=" + r.id,
    })),
    ] : [Promise.resolve([]), Promise.resolve([]), Promise.resolve([])]),
    safeQuery(supabase, "tasks", "id,title,client", raw, ["title", "client"], r => ({
      kind: "Задача", title: String(r.title || "—"), subtitle: String(r.client || ""),
      href: "/tasks",
    })),
    safeQuery(supabase, "properties", "id,title,address,price", raw, ["title", "address"], r => ({
      kind: "Объект", title: String(r.title || "—"), subtitle: [r.address, r.price ? Number(r.price).toLocaleString("ru-RU") + " ₸" : ""].filter(Boolean).join(" · "),
      href: "/dashboard/ours",
    })),
  ]);

  return NextResponse.json([...clientsA, ...clientsP, ...dealsK, ...dealsP, ...dealsZ, ...tasks, ...props].slice(0, 20));
}
