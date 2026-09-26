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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(user.id))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const monthsParam = request.nextUrl.searchParams.get("months") || "12";
  const categoryParam = request.nextUrl.searchParams.get("category") || "";
  const months = monthsParam === "all" ? null : Math.max(1, parseInt(monthsParam, 10) || 12);

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
  const start = months === null
    ? null
    : new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const inRange = filtered.filter(d => {
    if (!start || !d.created_at) return true;
    return new Date(d.created_at) >= start;
  });

  const closed = inRange.filter(d => CLOSED.includes(d.completed || ""));
  const lost = inRange.filter(d => (d.completed || "") === LOST);
  const active = inRange.filter(d => {
    const c = d.completed || "";
    return !CLOSED.includes(c) && c !== LOST;
  });

  const amounts = closed.map(d => dealCommission(d)).sort((a, b) => a - b);
  const revenue = amounts.reduce((a, b) => a + b, 0);
  const avg = closed.length ? revenue / closed.length : 0;
  const med = median(amounts);
  const total = inRange.length;
  const winRate = closed.length + lost.length > 0
    ? (closed.length / (closed.length + lost.length)) * 100
    : 0;
  const pipeline = active.reduce((a, d) => a + toNumber(d.amount), 0);

  // Помесячная динамика выручки (по created_at)
  const span = months === null ? 12 : months;
  const buckets: Array<{ key: string; label: string; revenue: number; count: number }> = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: monthLabel(d), revenue: 0, count: 0 });
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

  // По категориям
  const catMap = new Map<string, { revenue: number; count: number }>();
  for (const d of closed) {
    const c = d.category || "—";
    const cur = catMap.get(c) || { revenue: 0, count: 0 };
    cur.revenue += dealCommission(d);
    cur.count += 1;
    catMap.set(c, cur);
  }
  const byCategory = [...catMap.entries()].map(([category, v]) => ({ category, ...v }));

  // По типам объектов
  const typeMap = new Map<string, { revenue: number; count: number }>();
  for (const d of closed) {
    const cur = typeMap.get(d.typeLabel) || { revenue: 0, count: 0 };
    cur.revenue += dealCommission(d);
    cur.count += 1;
    typeMap.set(d.typeLabel, cur);
  }
  const byType = [...typeMap.entries()].map(([type, v]) => ({ type, ...v }));

  // Топ брокеров по закрытым комиссиям
  const brokerMap = new Map<string, { revenue: number; count: number }>();
  for (const d of closed) {
    const b = (d.broker || "").trim() || "Без брокера";
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
      pipeline,
      activeCount: active.length,
    },
    monthly: buckets,
    byStatus,
    byCategory,
    byType,
    topBrokers,
  });
}
