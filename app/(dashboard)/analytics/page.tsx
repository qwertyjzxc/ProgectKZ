"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Wallet, Scale, Calculator, CheckCircle2,
  Percent, Briefcase, Users, Loader2,
} from "lucide-react";
import { RevenueChart, StatusBars, Donut, type MonthPoint } from "@/components/AnalyticsCharts";
import { formatMoney } from "@/lib/format";
import { useProfile } from "@/lib/profile-context";

type MonthsKey = "3" | "6" | "12" | "all";

interface AnalyticsData {
  kpi: {
    revenue: number;
    median: number;
    average: number;
    closedCount: number;
    totalCount: number;
    winRate: number;
    pipeline: number;
    activeCount: number;
  };
  monthly: MonthPoint[];
  byStatus: Array<{ status: string; count: number }>;
  byCategory: Array<{ category: string; revenue: number; count: number }>;
  byType: Array<{ type: string; revenue: number; count: number }>;
  topBrokers: Array<{ broker: string; revenue: number; count: number }>;
}

const PERIODS: Array<{ key: MonthsKey; label: string }> = [
  { key: "3", label: "3 мес" },
  { key: "6", label: "6 мес" },
  { key: "12", label: "Год" },
  { key: "all", label: "Всё время" },
];

const CATEGORIES = [
  { id: "", label: "Все категории" },
  { id: "arenda", label: "Аренда" },
  { id: "pokupka", label: "Покупка" },
];

const CATEGORY_LABELS: Record<string, string> = { arenda: "Аренда", pokupka: "Покупка" };

function KpiCard({ icon: Icon, label, value, hint }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="w-4 h-4 text-blue-600" />
        {label}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1.5">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Icon className="w-5 h-5 text-blue-600" />{title}
      </h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function AnalyticsContent() {
  const router = useRouter();
  const { currentProfile } = useProfile();

  useEffect(() => {
    if (currentProfile && currentProfile.role !== "admin") router.replace("/overview");
  }, [currentProfile, router]);

  const [months, setMonths] = useState<MonthsKey>("12");
  const [category, setCategory] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/analytics?months=${months}&category=${category}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "Ошибка загрузки");
        setData(json);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [months, category, reloadKey]);

  const pickPeriod = (key: MonthsKey) => {
    setMonths(key);
    setLoading(true);
  };

  const pickCategory = (id: string) => {
    setCategory(id);
    setLoading(true);
  };

  const retry = () => {
    setError("");
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  if (currentProfile && currentProfile.role !== "admin") return null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />Аналитика продаж
          </h1>
          <p className="text-sm text-gray-500 mt-1">Медиана и средняя комиссия, доход, воронка и структура продаж</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 p-1 bg-white border rounded-lg shadow-sm">
            {PERIODS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => pickPeriod(p.key)}
                className={
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors " +
                  (months === p.key ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 bg-white border rounded-lg shadow-sm">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCategory(c.id)}
                className={
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors " +
                  (category === c.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800")
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка аналитики…
        </div>
      ) : error || !data ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-sm text-red-600">{error || "Нет данных"}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiCard icon={Wallet} label="Комиссия" value={formatMoney(data.kpi.revenue)} hint={`${data.kpi.closedCount} закрытых сделок`} />
            <KpiCard icon={Scale} label="Медиана комиссии" value={data.kpi.closedCount ? formatMoney(data.kpi.median) : "—"} hint="типичная комиссия без выбросов" />
            <KpiCard icon={Calculator} label="Средняя комиссия" value={data.kpi.closedCount ? formatMoney(data.kpi.average) : "—"} hint="комиссия / закрытые" />
            <KpiCard icon={CheckCircle2} label="Закрыто сделок" value={String(data.kpi.closedCount)} hint={`всего в периоде: ${data.kpi.totalCount}`} />
            <KpiCard icon={Percent} label="Конверсия в продажу" value={data.kpi.totalCount > 0 ? data.kpi.winRate + " %" : "—"} hint="закрытые / (закрытые + отказы)" />
            <KpiCard icon={Briefcase} label="В работе" value={formatMoney(data.kpi.pipeline)} hint={`${data.kpi.activeCount} активных сделок · суммы сделок`} />
          </div>

          <Card icon={Wallet} title="Динамика комиссий" subtitle="Закрытые сделки по месяцам · комиссия в тенге">
            <RevenueChart points={data.monthly} />
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card icon={BarChart3} title="Воронка по статусам" subtitle="Распределение всех сделок периода">
              <StatusBars items={data.byStatus} />
            </Card>
            <Card icon={Briefcase} title="Структура по типам" subtitle="Закрытые комиссии: квартиры, помещения, земля">
              <Donut items={data.byType} valueKey="revenue" />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card icon={Users} title="Топ брокеров" subtitle="По закрытым комиссиям за период">
              {data.topBrokers.length === 0 ? (
                <p className="text-sm text-gray-400">Нет закрытых сделок за период</p>
              ) : (
                <div className="space-y-2">
                  {data.topBrokers.map((b, i) => (
                    <div key={b.broker} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-gray-800 font-medium flex-1 truncate">{b.broker}</span>
                      <span className="text-gray-500">{b.count}</span>
                      <span className="text-gray-900 font-semibold w-32 text-right">{formatMoney(b.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card icon={Calculator} title="Аренда vs покупка" subtitle="Закрытые сделки по категориям">
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-gray-400">Нет закрытых сделок за период</p>
              ) : (
                <div className="space-y-4">
                  {data.byCategory.map(c => (
                    <div key={c.category} className="flex items-center justify-between text-sm border rounded-lg px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{CATEGORY_LABELS[c.category] || c.category}</p>
                        <p className="text-xs text-gray-400">{c.count} закрытых</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatMoney(c.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsContent />
    </Suspense>
  );
}
