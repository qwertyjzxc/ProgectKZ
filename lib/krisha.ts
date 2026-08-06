export interface KrishaListing {
  krisha_id: number;
  deal_type: string;
  prop_type: string;
  title: string;
  price: number;
  price_text: string;
  rooms: string;
  area: string;
  floor: string;
  address: string;
  description: string;
  image_url: string;
  krisha_url: string;
}

export interface KrishaParams {
  dealType?: string;
  propType?: string;
  district?: string;
  rooms?: string;
  budgetFrom?: string;
  budgetTo?: string;
}

export interface KrishaBatch {
  items: KrishaListing[];
  pagesFetched: number;
  totalPages: number;
}

export interface KrishaPageProgress {
  page: number;
  totalPages: number;
  items: KrishaListing[];
  pagesFetched: number;
}

const CITY = "shymkent";
export const MAX_KRISHA_PAGES = 504;

// Все категории, которые синхронизируются с krisha.kz в базу
export const KRISHA_CATEGORIES = [
  { dealType: "Продажа", propType: "Квартира" },
  { dealType: "Аренда", propType: "Квартира" },
  { dealType: "Продажа", propType: "Дом" },
  { dealType: "Аренда", propType: "Дом" },
  { dealType: "Продажа", propType: "Участок" },
  { dealType: "Продажа", propType: "Помещение" },
  { dealType: "Аренда", propType: "Помещение" },
];

const PROP_CATEGORIES: Record<string, string> = {
  "Квартира": "kvartiry",
  "Дом": "doma-dachi",
  "Участок": "uchastkov",
  "Помещение": "kommercheskaya-nedvizhimost",
};

const DISTRICTS: Record<string, string> = {
  "Абайский": "shymkent-abajskij",
  "Абайский район": "shymkent-abajskij",
  "Аль-Фарабийский": "shymkent-al-farabijskij",
  "Аль-Фарабийский район": "shymkent-al-farabijskij",
  "Енбекшинский": "shymkent-enbekshinskij",
  "Енбекшинский район": "shymkent-enbekshinskij",
  "Каратауский": "karatauskij",
  "Каратауский район": "karatauskij",
  "Туранский": "shymkent-turan",
  "Туранский район": "shymkent-turan",
};

export function buildKrishaUrl(params: KrishaParams, page = 1): string {
  const section = params.dealType === "Аренда" ? "arenda" : "prodazha";
  const category = PROP_CATEGORIES[params.propType || ""] || "kvartiry";

  const search = new URLSearchParams();
  if (page > 1) search.set("page", String(page));
  if (params.rooms) {
    const rooms = params.rooms === "5+" ? "5.100" : params.rooms;
    search.set("das[live.rooms]", rooms);
  }
  if (params.budgetFrom) search.set("das[price][from]", params.budgetFrom);
  if (params.budgetTo) search.set("das[price][to]", params.budgetTo);

  const districtSlug = DISTRICTS[params.district || ""];
  const base = `https://krisha.kz/${section}/${category}/${CITY}/`;
  const path = districtSlug ? base + districtSlug + "/" : base;
  const qs = search.toString();
  return qs ? path + "?" + qs : path;
}

export function detectTotalPages(html: string): number {
  const re = /data-page="(\d+)"/g;
  let m: RegExpExecArray | null;
  let max = 0;
  while ((m = re.exec(html)) !== null) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return max;
}

export function parseKrishaListings(
  html: string,
  dealType: string,
  propType: string
): KrishaListing[] {
  const chunks = html.split('class="a-card a-storage').slice(1);
  const results: KrishaListing[] = [];

  for (const chunk of chunks) {
    const idMatch = chunk.match(/data-product-id="(\d+)"/);
    if (!idMatch) continue;

    const titleMatch = chunk.match(/class="a-card__title[^"]*"[^>]*>([^<]*)</);
    const priceMatch = chunk.match(/<div class="a-card__price">([\s\S]*?)<\/div>/);
    const subtitleMatch = chunk.match(/class="a-card__subtitle[^"]*">\s*([^<]+)/);
    const descMatch = chunk.match(/class="a-card__text-preview">([\s\S]*?)<\/div>/);
    const imageMatch = chunk.match(/data-full-src="([^"]+)"/);
    const urlMatch = chunk.match(/href="(\/a\/show\/\d+)"/);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const priceRaw = priceMatch
      ? priceMatch[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
      : "";
    const priceNum = priceMatch
      ? parseInt((priceMatch[1].replace(/&nbsp;|\s+/g, "").match(/\d{4,}/) || ["0"])[0], 10) || 0
      : 0;

    const roomsMatch = title.match(/(\d+)-комнатн/);
    const areaMatch = title.match(/·\s*([\d.,]+)\s*м²/);
    const floorMatch = title.match(/в\s+(\d+)\s*\/\s*(\d+)/);

    let imageUrl = imageMatch ? imageMatch[1] : "";
    imageUrl = imageUrl.replace(/-full\.(webp|jpe?g)$/i, "-400x300.jpg");

    results.push({
      krisha_id: parseInt(idMatch[1], 10),
      deal_type: dealType,
      prop_type: propType,
      title,
      price: priceNum,
      price_text: priceRaw,
      rooms: roomsMatch ? roomsMatch[1] + "-комн." : "",
      area: areaMatch ? areaMatch[1].replace(",", ".") + " м²" : "",
      floor: floorMatch ? floorMatch[1] + "/" + floorMatch[2] : "",
      address: subtitleMatch ? subtitleMatch[1].trim() : "",
      description: descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "",
      image_url: imageUrl,
      krisha_url: urlMatch ? "https://krisha.kz" + urlMatch[1] : "",
    });
  }

  return results;
}

export async function fetchKrishaHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml",
      Referer: "https://krisha.kz/",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Krisha.kz вернул статус ${response.status}`);
  }

  const html = await response.text();
  if (html.length < 10_000 || /captcha/i.test(html.slice(0, 4000))) {
    throw new Error("Krisha.kz не отдал список объявлений (возможна защита от ботов)");
  }

  return html;
}

export async function fetchKrishaListings(params: KrishaParams): Promise<KrishaListing[]> {
  const html = await fetchKrishaHtml(buildKrishaUrl(params, 1));
  const dealType = params.dealType === "Аренда" ? "Аренда" : "Продажа";
  const propType = params.propType || "Квартира";
  return parseKrishaListings(html, dealType, propType);
}

export async function fetchAllKrishaListings(
  params: KrishaParams,
  maxPages: number,
  onPage?: (progress: KrishaPageProgress) => void | Promise<void>
): Promise<KrishaBatch> {
  const dealType = params.dealType === "Аренда" ? "Аренда" : "Продажа";
  const propType = params.propType || "Квартира";
  const limit = Math.max(1, Math.min(MAX_KRISHA_PAGES, maxPages));

  const seen = new Map<number, KrishaListing>();
  let totalPages = 0;
  let pagesFetched = 0;
  const delayMs = 400;

  for (let page = 1; page <= limit; page++) {
    let html: string;
    try {
      html = await fetchKrishaHtml(buildKrishaUrl(params, page));
    } catch (e) {
      if (page === 1) throw e;
      break;
    }

    if (page === 1) {
      totalPages = detectTotalPages(html);
    }

    const items = parseKrishaListings(html, dealType, propType);
    for (const it of items) seen.set(it.krisha_id, it);
    pagesFetched += 1;

    if (onPage) {
      await onPage({ page, totalPages, items, pagesFetched });
    }

    if (items.length === 0) break;

    if (page < limit) await new Promise((r) => setTimeout(r, delayMs));
  }

  return {
    items: Array.from(seen.values()),
    pagesFetched,
    totalPages,
  };
}
