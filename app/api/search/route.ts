import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface SearchHit {
  kind: string;
  title: string;
  subtitle: string;
  href: string;
}

async function safeQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  const [clientsA, clientsP, dealsK, dealsP, dealsZ, tasks, props] = await Promise.all([
    safeQuery(supabase, "clients_arenda", "id,name,phone,address", raw, ["name", "phone", "address"], r => ({
      kind: "Клиент", title: String(r.name || "—"), subtitle: [r.phone, r.address].filter(Boolean).join(" · ") + " · Аренда",
      href: "/clients",
    })),
    safeQuery(supabase, "clients_prodaja", "id,name,phone,address", raw, ["name", "phone", "address"], r => ({
      kind: "Клиент", title: String(r.name || "—"), subtitle: [r.phone, r.address].filter(Boolean).join(" · ") + " · Покупка",
      href: "/clients/sell",
    })),
    safeQuery(supabase, "deals_kvartiry", "id,name,client,phone,amount,category", raw, ["name", "client", "phone"], r => ({
      kind: "Сделка", title: String(r.name || r.client || "—"), subtitle: [r.phone, r.amount ? Number(r.amount).toLocaleString("ru-RU") + " ₸" : ""].filter(Boolean).join(" · ") + " · Квартиры",
      href: "/deals?category=" + (r.category || "arenda"),
    })),
    safeQuery(supabase, "deals_pomescheniya", "id,name,client,phone,amount,category", raw, ["name", "client", "phone"], r => ({
      kind: "Сделка", title: String(r.name || r.client || "—"), subtitle: [r.phone, r.amount ? Number(r.amount).toLocaleString("ru-RU") + " ₸" : ""].filter(Boolean).join(" · ") + " · Помещения",
      href: "/deals?category=" + (r.category || "arenda"),
    })),
    safeQuery(supabase, "deals_zemlya", "id,name,client,phone,amount,category", raw, ["name", "client", "phone"], r => ({
      kind: "Сделка", title: String(r.name || r.client || "—"), subtitle: [r.phone, r.amount ? Number(r.amount).toLocaleString("ru-RU") + " ₸" : ""].filter(Boolean).join(" · ") + " · Земля",
      href: "/deals?category=" + (r.category || "arenda"),
    })),
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
