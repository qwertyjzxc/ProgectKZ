import { NextRequest, NextResponse } from "next/server";
import {
  buildKrishaUrl,
  detectTotalPages,
  fetchKrishaHtml,
  parseKrishaListings,
  MAX_KRISHA_PAGES,
  type KrishaParams,
} from "@/lib/krisha";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params: KrishaParams = {
    dealType: sp.get("dealType") || "",
    propType: sp.get("propType") || "",
    district: sp.get("district") || "",
    rooms: sp.get("rooms") || "",
    budgetFrom: sp.get("budgetFrom") || "",
    budgetTo: sp.get("budgetTo") || "",
  };
  const page = Math.max(1, Math.min(MAX_KRISHA_PAGES, parseInt(sp.get("page") || "1", 10) || 1));

  try {
    const html = await fetchKrishaHtml(buildKrishaUrl(params, page));
    const dealType = params.dealType === "Аренда" ? "Аренда" : "Продажа";
    const propType = params.propType || "Квартира";
    return NextResponse.json({
      items: parseKrishaListings(html, dealType, propType),
      page,
      totalPages: detectTotalPages(html),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки с Krisha.kz" },
      { status: 502 }
    );
  }
}
