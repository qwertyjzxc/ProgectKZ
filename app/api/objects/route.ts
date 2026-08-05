import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { fetchAllKrishaListings, MAX_KRISHA_PAGES, type KrishaParams } from "@/lib/krisha";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const perPage = Math.max(1, Math.min(100, parseInt(searchParams.get("perPage") || "30", 10) || 30));
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const supabase = await createClient();
    const { count } = await supabase.from("objects").select("*", { count: "exact", head: true });
    const { data, error } = await supabase
      .from("objects")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const total = count ?? 0;
    return NextResponse.json({
      items: data,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const params: KrishaParams = {
      dealType: String(body.dealType || ""),
      propType: String(body.propType || ""),
      district: String(body.district || ""),
      rooms: body.rooms ? String(body.rooms) : "",
      budgetFrom: String(body.budgetFrom || ""),
      budgetTo: String(body.budgetTo || ""),
    };
    const pages = Math.max(1, Math.min(MAX_KRISHA_PAGES, parseInt(String(body.pages || "1"), 10) || 1));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));

        try {
          const batch = await fetchAllKrishaListings(params, pages, async ({ page, totalPages, items }) => {
            if (items.length > 0) {
              const { error } = await serviceClient
                .from("objects")
                .upsert(items, { onConflict: "krisha_id" });
              if (error) throw new Error(error.message);
            }
            send({ type: "progress", page, totalPages, items });
          });
          send({ type: "done", imported: batch.items.length, pagesFetched: batch.pagesFetched, totalPages: batch.totalPages });
        } catch (e) {
          send({ type: "error", message: e instanceof Error ? e.message : "Ошибка загрузки с Krisha.kz" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки с Krisha.kz" },
      { status: 500 }
    );
  }
}
