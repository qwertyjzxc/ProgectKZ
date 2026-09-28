import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { normalizeDealCategory } from "@/lib/deal-types";

const TABLES = [
  { key: "kvartiry", table: "deals_kvartiry", label: "Квартиры" },
  { key: "pomescheniya", table: "deals_pomescheniya", label: "Помещения" },
  { key: "zemlya", table: "deals_zemlya", label: "Земля" },
] as const;

const LOST = "Отказ";
// Терминальный статус закрытой сделки — "Сделка".
// "Завершено" — legacy, оставлен для старых строк до миграции.
const CLOSED = ["Завершено", "Сделка"];

interface RawDeal {
  id: number;
  amount: number | string | null;
  commission: number | string | null;
  completed: string | null;
  category: string | null;
  date: string | null;
  created_at: string | null;
  broker: string | null;
}

// Доход агентства — комиссия брокера, а не сумма сделки.
function dealCommission(d: RawDeal): number {
  return toNumber(d.commission);
}

function toNumber(v: number | string | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function monthKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// Произвольный период "от–до": фронт шлёт YYYY-MM-DD (DatePicker).
function parseBound(v: string, endOfDay: boolean): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(t.getTime())) return null;
  t.setHours(0, 0, 0, 0);
  return t.getTime() + (endOfDay ? 86399999 : 0);
}

// Помесячные корзины между двумя датами (макс 36, чтобы не раздувать ответ).
function rangeBuckets(fromTs: number, toTs: number): Array<{ key: string; label: string; revenue: number; count: number }> {
  const out: Array<{ key: string; label: string; revenue: number; count: number }> = [];
  const cur = new Date(fromTs);
  cur.setDate(1);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(toTs);
  let guard = 0;
  while ((cur.getFullYear() < end.getFullYear() || (cur.getFullYear() === end.getFullYear() && cur.getMonth() <= end.getMonth())) && guard < 36) {
    out.push({ key: monthKey(cur), label: monthLabel(cur), revenue: 0, count: 0 });
    cur.setMonth(cur.getMonth() + 1);
    guard++;
  }
  return out.length > 0 ? out : [{ key: monthKey(new Date(toTs)), label: monthLabel(new Date(toTs)), revenue: 0, count: 0 }];
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const monthsParam = request.nextUrl.searchParams.get("months") || "12";
  const categoryParam = request.nextUrl.searchParams.get("category") || "";
  const months = monthsParam === "all" ? null : Math.max(1, parseInt(monthsParam, 10) || 12);
  // Свой период имеет приоритет над пресетом months
  let fromTs = parseBound(request.nextUrl.searchParams.get("from") || "", false);
  let toTs = parseBound(request.nextUrl.searchParams.get("to") || "", true);
  if (fromTs !== null && toTs !== null && fromTs > toTs) {
    const tmp = fromTs;
    fromTs = toTs - 86399999;
    toTs = tmp + 86399999;
  }
  const useCustom = fromTs !== null || toTs !== null;

  const all: Array<RawDeal & { dealType: string; typeLabel: string }> = [];
  // Параллельно: таблицы независимы, последовательные await-ы утраивали латентность
  const perTable = await Promise.all(
    TABLES.map(async t => {
      // Колонки commission может не быть в старых БД — тогда откатываемся
      // на список без неё (комиссии посчитаются нулями, в логах будет warn).
      let { data, error } = await supabase
        .from(t.table)
        .select("id,amount,commission,completed,category,date,created_at,broker");
      if (error && /commission/.test(error.message)) {
        console.warn(`[schema-drift] таблица "${t.table}": нет колонки commission, аналитика посчитает её нулём. Примените supabase-deals-complete-fields.sql.`);
        ({ data, error } = await supabase
          .from(t.table)
          .select("id,amount,completed,category,date,created_at,broker"));
      }
      if (error) throw new Error(error.message);
      return { t, rows: (data || []) as RawDeal[] };
    })
  ).catch((e: Error) => ({ error: e.message }));
  if ("error" in (perTable as object)) {
    return NextResponse.json({ error: (perTable as { error: string }).error }, { status: 500 });
  }
  for (const { t, rows } of perTable as Array<{ t: (typeof TABLES)[number]; rows: RawDeal[] }>) {
    for (const d of rows) {
      all.push({ ...d, dealType: t.key, typeLabel: t.label });
    }
  }

  const filtered = categoryParam
    ? all.filter(d => normalizeDealCategory(d.category) === normalizeDealCategory(categoryParam))
    : all;

  const now = new Date();
  const start = !useCustom && months !== null
    ? new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
    : null;

  const inRange = filtered.filter(d => {
    if (!d.created_at) return true;
    const t = new Date(d.created_at).getTime();
    if (isNaN(t)) return true;
    if (fromTs !== null && t < fromTs) return false;
    if (toTs !== null && t > toTs) return false;
    if (start && t < start.getTime()) return false;
    return true;
  });

  const closed = inRange.filter(d => CLOSED.includes(d.completed || ""));
  const lost = inRange.filter(d => (d.completed || "") === LOST);
  const active = inRange.filter(d => {
    const c = d.completed || "";
    return !CLOSED.includes(c) && c !== LOST;
  });

  // Потери на клиентах («Закрыт без сделки»): такие клиенты до сделок не
  // доходят, но для конверсии это отказы. Считаем в том же периоде/категории.
  // Ошибка чтения клиентских таблиц конверсию ронять не должна.
  let lostClients = 0;
  try {
    const clientTables = !categoryParam || normalizeDealCategory(categoryParam) === "arenda"
      ? ["clients_arenda"]
      : ["clients_prodaja", "clients_pokupka"];
    if (!categoryParam) clientTables.push("clients_prodaja", "clients_pokupka");
    const counts = await Promise.all(
      clientTables.map(async t => {
        let q = supabase.from(t).select("id", { count: "exact", head: true }).eq("completed", "Закрыт без сделки");
        if (fromTs !== null) q = q.gte("created_at", new Date(fromTs).toISOString());
        if (toTs !== null) q = q.lte("created_at", new Date(toTs).toISOString());
        if (start) q = q.gte("created_at", start.toISOString());
        const { count, error } = await q;
        if (error) throw new Error(error.message);
        return count || 0;
      })
    );
    lostClients = counts.reduce((a, b) => a + b, 0);
  } catch (e) {
    console.warn("[analytics] не удалось посчитать потери клиентов:", e instanceof Error ? e.message : e);
  }

  const amounts = closed.map(d => dealCommission(d)).sort((a, b) => a - b);
  const revenue = amounts.reduce((a, b) => a + b, 0);
  const avg = closed.length ? revenue / closed.length : 0;
  const med = median(amounts);
  const total = inRange.length;
  const lostTotal = lost.length + lostClients;
  const winRate = closed.length + lostTotal > 0
    ? (closed.length / (closed.length + lostTotal)) * 100
    : 0;
  const pipeline = active.reduce((a, d) => a + toNumber(d.amount), 0);

  // Помесячная динамика комиссий (по created_at).
  // При своём периоде корзины строятся по нему, иначе — последние N месяцев.
  const span = months === null ? 12 : months;
  let buckets: Array<{ key: string; label: string; revenue: number; count: number }>;
  if (useCustom) {
    const rangeFrom = fromTs !== null ? fromTs : toTs! - 11 * 31 * 86400000;
    const rangeTo = toTs !== null ? toTs : fromTs! + 11 * 31 * 86400000;
    buckets = rangeBuckets(Math.min(rangeFrom, rangeTo), Math.max(rangeFrom, rangeTo));
  } else {
    buckets = [];
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: monthKey(d), label: monthLabel(d), revenue: 0, count: 0 });
    }
  }
  const byKey = new Map(buckets.map(b => [b.key, b]));
  for (const d of closed) {
    if (!d.created_at) continue;
    const b = byKey.get(monthKey(new Date(d.created_at)));
    if (b) {
      b.revenue += dealCommission(d);
      b.count += 1;
    }
  }

  // Воронка по статусам
  const statusMap = new Map<string, number>();
  for (const d of inRange) {
    const s = d.completed || "—";
    statusMap.set(s, (statusMap.get(s) || 0) + 1);
  }
  const byStatus = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Категория с нормализацией legacy (prodaja -> pokupka), пусто остаётся "—"
  const normCat = (d: RawDeal): string => (d.category ? normalizeDealCategory(d.category) : "—");

  // По категориям
  const catMap = new Map<string, { revenue: number; count: number }>();
  for (const d of closed) {
    const c = normCat(d);
    const cur = catMap.get(c) || { revenue: 0, count: 0 };
    cur.revenue += dealCommission(d);
    cur.count += 1;
    catMap.set(c, cur);
  }
  const byCategory = [...catMap.entries()].map(([category, v]) => ({ category, ...v }));

  // Аренда vs покупка по каждому брокеру (для селектора в карточке).
  // Сделки без брокера пропускаем — псевдо-брокера «Без брокера» нет.
  const brokerCatMap = new Map<string, Map<string, { revenue: number; count: number }>>();
  for (const d of closed) {
    const b = (d.broker || "").trim();
    if (!b) continue;
    const c = normCat(d);
    let inner = brokerCatMap.get(b);
    if (!inner) {
      inner = new Map();
      brokerCatMap.set(b, inner);
    }
    const cur = inner.get(c) || { revenue: 0, count: 0 };
    cur.revenue += dealCommission(d);
    cur.count += 1;
    inner.set(c, cur);
  }
  const byBrokerCategory = [...brokerCatMap.entries()]
    .map(([broker, inner]) => ({
      broker,
      rows: [...inner.entries()].map(([category, v]) => ({ category, ...v })),
      total: [...inner.values()].reduce((a, v) => a + v.revenue, 0),
    }))
    .sort((a, b) => b.total - a.total);

  // По типам объектов
  const typeMap = new Map<string, { revenue: number; count: number }>();
  for (const d of closed) {
    const cur = typeMap.get(d.typeLabel) || { revenue: 0, count: 0 };
    cur.revenue += dealCommission(d);
    cur.count += 1;
    typeMap.set(d.typeLabel, cur);
  }
  const byType = [...typeMap.entries()].map(([type, v]) => ({ type, ...v }));

  // Топ брокеров по закрытым комиссиям (без брокера — пропускаем)
  const brokerMap = new Map<string, { revenue: number; count: number }>();
  for (const d of closed) {
    const b = (d.broker || "").trim();
    if (!b) continue;
    const cur = brokerMap.get(b) || { revenue: 0, count: 0 };
    cur.revenue += dealCommission(d);
    cur.count += 1;
    brokerMap.set(b, cur);
  }
  const topBrokers = [...brokerMap.entries()]
    .map(([broker, v]) => ({ broker, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return NextResponse.json({
    kpi: {
      revenue,
      median: med,
      average: avg,
      closedCount: closed.length,
      totalCount: total,
      winRate: Math.round(winRate * 10) / 10,
      lostDeals: lost.length,
      lostClients,
      pipeline,
      activeCount: active.length,
    },
    monthly: buckets,
    byStatus,
    byCategory,
    byBrokerCategory,
    byType,
    topBrokers,
  });
}
