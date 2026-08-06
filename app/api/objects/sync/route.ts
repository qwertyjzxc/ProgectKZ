import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import {
  fetchAllKrishaListings,
  KRISHA_CATEGORIES,
  MAX_KRISHA_PAGES,
  type KrishaListing,
} from "@/lib/krisha";

export const maxDuration = 300;

async function syncCategory(dealType: string, propType: string, maxPages: number) {
  const runStarted = new Date().toISOString();

  const batch = await fetchAllKrishaListings(
    { dealType, propType },
    maxPages,
    async ({ items }) => {
      if (items.length === 0) return;
      const rows: (KrishaListing & { is_active: boolean; last_seen_at: string })[] = items.map(it => ({
        ...it,
        is_active: true,
        last_seen_at: runStarted,
      }));
      const { error } = await serviceClient.from("objects").upsert(rows, { onConflict: "krisha_id" });
      if (error) throw new Error(error.message);
    }
  );

  // Снимаем с публикации объявления категории, которых больше нет на krisha.kz.
  // Деактивация выполняется ТОЛЬКО если категория была обойдена полностью
  // (иначе неполный обход «удалит» объявления со страниц, которые не успели скачать).
  let deactivated = 0;
  const completed = batch.totalPages > 0 && batch.pagesFetched >= batch.totalPages;
  if (completed && batch.items.length > 0) {
    const { data, error } = await serviceClient
      .from("objects")
      .update({ is_active: false })
      .eq("deal_type", dealType)
      .eq("prop_type", propType)
      .lt("last_seen_at", runStarted)
      .select("id");
    if (error) throw new Error(error.message);
    deactivated = data?.length ?? 0;
  }

  return {
    dealType,
    propType,
    imported: batch.items.length,
    pagesFetched: batch.pagesFetched,
    totalPages: batch.totalPages,
    completed,
    deactivated,
  };
}

async function handle(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const maxPages = Math.max(
    1,
    Math.min(MAX_KRISHA_PAGES, parseInt(String(body.maxPages || request.nextUrl.searchParams.get("maxPages") || MAX_KRISHA_PAGES), 10) || MAX_KRISHA_PAGES)
  );

  const categories =
    body.dealType || body.propType || request.nextUrl.searchParams.get("dealType") || request.nextUrl.searchParams.get("propType")
      ? [{
          dealType: String(body.dealType || request.nextUrl.searchParams.get("dealType") || "Продажа"),
          propType: String(body.propType || request.nextUrl.searchParams.get("propType") || "Квартира"),
        }]
      : KRISHA_CATEGORIES;

  const results = [];
  for (const cat of categories) {
    results.push(await syncCategory(cat.dealType, cat.propType, maxPages));
  }

  const imported = results.reduce((s, r) => s + r.imported, 0);
  const deactivated = results.reduce((s, r) => s + r.deactivated, 0);
  return NextResponse.json({ ok: true, imported, deactivated, results });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
