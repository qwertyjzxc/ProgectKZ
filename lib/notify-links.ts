// Чистые хелперы ссылок для уведомлений — БЕЗ серверных импортов,
// можно использовать и в браузере, и в API-роутах.

const DEAL_KEYS = ["kvartiry", "pomescheniya", "zemlya"];
const DEAL_CATS = ["arenda", "pokupka"];

export function dealListLink(typeKey: unknown, category: unknown, id?: number | null): string {
  const t = DEAL_KEYS.includes(String(typeKey)) ? String(typeKey) : "kvartiry";
  const c = DEAL_CATS.includes(String(category)) ? String(category) : "arenda";
  return `/deals?category=${c}&type=${t}` + (id ? `&view=${id}` : "");
}

const CLIENT_TYPE_TO_CAT: Record<string, string> = {
  "Квартира": "apartments",
  "Помещения": "premises",
  "Земля": "houses",
  "Дома": "houses",
};

export function clientListLink(clientCategory: unknown, rowType: unknown, id?: number | null): string {
  const base = clientCategory === "prodaja" ? "/clients/sell" : "/clients";
  const cat = CLIENT_TYPE_TO_CAT[String(rowType || "")];
  return (cat ? `${base}?cat=${cat}` : base) + (id ? `${cat ? "&" : "?"}view=${id}` : "");
}

// Ссылка на ветку журнала по ссылке уведомления: /deals?category=X&type=Y -> deals_Y,
// /clients -> clients_arenda, /clients/sell -> clients_prodaja.
export function activityTarget(href: string, relatedId: number | null): string | null {
  if (!relatedId) return null;
  try {
    const u = new URL(href, "http://localhost");
    if (u.pathname === "/deals") {
      const t = u.searchParams.get("type");
      if (t !== "kvartiry" && t !== "pomescheniya" && t !== "zemlya") return null;
      return `/activity?table=deals_${t}&client=${relatedId}`;
    }
    if (u.pathname === "/clients") return `/activity?table=clients_arenda&client=${relatedId}`;
    if (u.pathname === "/clients/sell") return `/activity?table=clients_prodaja&client=${relatedId}`;
  } catch {
    return null;
  }
  return null;
}
