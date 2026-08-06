"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

type RangeKey = "week" | "month" | "all";
type Granularity = "day" | "week" | "month";

interface DealPoint {
  key: string;
  label: string;
  value: number;
  count: number;
}

interface SalesChartProps {
  deals: Array<{ id: number; amount: number; date: string; stage: string }>;
}

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "all", label: "Всё время" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const TOOLTIP_W = 170;

function startOfDay(d: Date): number {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

function startOfWeek(d: Date): number {
  const t = startOfDay(d);
  const day = (new Date(t).getDay() + 6) % 7;
  return t - day * DAY_MS;
}

function startOfMonth(d: Date): number {
  const t = new Date(d);
  t.setDate(1);
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

function addBucket(t: number, g: Granularity): number {
  if (g === "month") {
    const d = new Date(t);
    d.setMonth(d.getMonth() + 1);
    return d.getTime();
  }
  return t + (g === "week" ? 7 : 1) * DAY_MS;
}

function bucketFloor(t: number, g: Granularity): number {
  if (g === "day") return startOfDay(new Date(t));
  if (g === "week") return startOfWeek(new Date(t));
  return startOfMonth(new Date(t));
}

function parseDealDate(s: string): number {
  const ru = (s || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ru) return new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1])).getTime();
  const iso = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const d = new Date(s);
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

function bucketLabel(t: number, g: Granularity): string {
  const d = new Date(t);
  if (g === "month") return d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function formatFull(n: number): string {
  return Math.round(n).toLocaleString("ru-RU") + " ₸";
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return (m >= 100 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")) + "M";
  }
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(Math.round(n));
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / pow;
  let target = 1;
  for (const s of [1, 2, 2.5, 5, 10]) {
    if (norm <= s) {
      target = s;
      break;
    }
  }
  return target * pow;
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "сделка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "сделки";
  return "сделок";
}

function buildPoints(closed: Array<{ t: number; amount: number }>, range: RangeKey) {
  const today = startOfDay(new Date());
  let start: number;
  let g: Granularity;

  if (range === "week") {
    start = today - 6 * DAY_MS;
    g = "day";
  } else if (range === "month") {
    start = today - 29 * DAY_MS;
    g = "day";
  } else {
    let first = today;
    for (const d of closed) if (d.t < first) first = d.t;
    const span = today - first;
    g = span <= 62 * DAY_MS ? "day" : span <= 400 * DAY_MS ? "week" : "month";
    start = bucketFloor(first, g);
  }

  const sums = new Map<number, { value: number; count: number }>();
  for (const d of closed) {
    const k = bucketFloor(d.t, g);
    const cur = sums.get(k) || { value: 0, count: 0 };
    cur.value += d.amount;
    cur.count += 1;
    sums.set(k, cur);
  }

  const points: DealPoint[] = [];
  for (let t = start; t <= today; t = addBucket(t, g)) {
    const s = sums.get(t) || { value: 0, count: 0 };
    points.push({ key: String(t), label: bucketLabel(t, g), value: s.value, count: s.count });
  }

  const total = points.reduce((a, p) => a + p.value, 0);
  const totalCount = points.reduce((a, p) => a + p.count, 0);
  return { points, total, totalCount };
}

function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function SalesChart({ deals }: SalesChartProps) {
  const [range, setRange] = useState<RangeKey>("all");
  const [active, setActive] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closed = useMemo(() => deals.filter(d => d.stage === "Сделка закрыта"), [deals]);

  const { points, total, totalCount } = useMemo(() => {
    const list = closed
      .map(d => ({ t: parseDealDate(d.date), amount: d.amount || 0 }))
      .filter(p => !isNaN(p.t));
    return buildPoints(list, range);
  }, [closed, range]);

  const height = 280;
  const padL = 64;
  const padR = 20;
  const padT = 24;
  const padB = 34;

  const maxV = niceCeil(Math.max(1, ...points.map(p => p.value)));
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + innerH - (v / maxV) * innerH;
  const baseline = y(0);

  const yTicks = Array.from({ length: 5 }, (_, i) => (maxV / 4) * i);

  const xTickStep = Math.max(1, Math.ceil(points.length / 7));
  const xTicks = points.map((p, i) => ({ p, i })).filter(({ i }) => i % xTickStep === 0);

  const linePoints = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
  const linePath = smoothPath(linePoints);
  const areaPath = points.length > 0
    ? `${linePath} L ${x(points.length - 1).toFixed(2)} ${baseline.toFixed(2)} L ${x(0).toFixed(2)} ${baseline.toFixed(2)} Z`
    : "";

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    if (points.length === 1) {
      setActive(0);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let idx = Math.round((mx - padL) / stepX);
    idx = Math.max(0, Math.min(points.length - 1, idx));
    setActive(idx);
  };

  const activePoint = active !== null ? points[active] : null;
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  const tooltipLeft = activePoint && active !== null
    ? Math.min(Math.max(padL, x(active) - TOOLTIP_W / 2), Math.max(padL, width - TOOLTIP_W - 8))
    : 0;
  const tooltipTop = activePoint && active !== null
    ? Math.max(2, Math.min(y(activePoint.value) - 64, height - 76))
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />Продажи
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Закрытые сделки · выручка в тенге</p>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {RANGES.map(r => (
            <button
              key={r.key}
              type="button"
              onClick={() => { setRange(r.key); setActive(null); }}
              className={
                "px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors " +
                (range === r.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-8 mb-5 flex-wrap">
        <div>
          <p className="text-xs text-gray-400">Выручка за период</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatFull(total)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Закрыто сделок</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Средняя сделка</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalCount ? formatFull(total / totalCount) : "—"}</p>
        </div>
      </div>

      <div ref={wrapRef} className="relative">
        {width === 0 ? (
          <div style={{ height }} />
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-400" style={{ height }}>
            <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Нет закрытых сделок за этот период</p>
          </div>
        ) : (
          <>
            <svg
              width={width}
              height={height}
              className="block select-none"
              onMouseMove={handleMove}
              onMouseLeave={() => setActive(null)}
            >
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {yTicks.map((v, i) => (
                <g key={"yt" + i}>
                  <line x1={padL} y1={y(v)} x2={padL + innerW} y2={y(v)} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="3 4" />
                  <text x={padL - 10} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">{formatCompact(v)}</text>
                </g>
              ))}

              <line x1={padL} y1={baseline} x2={padL + innerW} y2={baseline} stroke="#e2e8f0" strokeWidth={1} />

              {areaPath && <path d={areaPath} fill="url(#salesFill)" />}
              {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

              {lastPoint && (
                <g>
                  <circle cx={x(points.length - 1)} cy={y(lastPoint.value)} r={8} fill="#2563eb" opacity={0.2} />
                  <circle cx={x(points.length - 1)} cy={y(lastPoint.value)} r={4.5} fill="#2563eb" />
                </g>
              )}

              {active !== null && activePoint && (
                <g>
                  <line x1={x(active)} y1={padT} x2={x(active)} y2={baseline} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
                  <circle cx={x(active)} cy={y(activePoint.value)} r={4} fill="#fff" stroke="#2563eb" strokeWidth={2} />
                </g>
              )}

              {xTicks.map(({ p, i }) => (
                <text key={p.key} x={x(i)} y={padT + innerH + 20} textAnchor="middle" fontSize={11} fill="#94a3b8">{p.label}</text>
              ))}
            </svg>

            {active !== null && activePoint && (
              <div
                className="pointer-events-none absolute z-10 bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2"
                style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_W }}
              >
                <p className="text-[11px] text-gray-400">{activePoint.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{formatFull(activePoint.value)}</p>
                <p className="text-[11px] text-gray-500">{activePoint.count} {plural(activePoint.count)}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
