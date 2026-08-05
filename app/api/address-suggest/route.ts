import { NextRequest, NextResponse } from "next/server";

const SUGGEST_URL = "https://suggest-maps.yandex.ru/v1/suggest";
// Бounding box г. Шымкент (минимальные/максимальные lon,lat)
const SHYMKENT_BBOX = "69.30,42.15,70.05,42.50";

interface CacheEntry {
  results: { title: string; subtitle: string }[];
  at: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 300;

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.YANDEX_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YANDEX_API_KEY не задан в .env.local" },
      { status: 503 }
    );
  }

  const now = Date.now();
  const cached = cache.get(q);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.results });
  }

  try {
    const url =
      SUGGEST_URL +
      "?apikey=" +
      encodeURIComponent(apiKey) +
      "&text=" +
      encodeURIComponent(q) +
      "&lang=ru_RU" +
      "&results=7" +
      "&types=geo" +
      "&bbox=" +
      SHYMKENT_BBOX +
      "&strict_bounds=1";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Ошибка сервиса подсказок Yandex: " + res.status },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { results?: unknown };
    const raw: { title?: { text?: string }; subtitle?: { text?: string } }[] = Array.isArray(data.results)
      ? (data.results as { title?: { text?: string }; subtitle?: { text?: string } }[])
      : [];
    const results: { title: string; subtitle: string }[] = raw
      .map(r => ({
        title: r.title?.text || "",
        subtitle: r.subtitle?.text || "",
      }))
      .filter(r => r.title);

    if (cache.size >= CACHE_MAX) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    cache.set(q, { results, at: now });

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка подсказок" },
      { status: 502 }
    );
  }
}
