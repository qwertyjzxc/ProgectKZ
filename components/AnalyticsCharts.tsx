"use client";

import { useEffect, useRef, useState } from "react";

export interface MonthPoint {
  key: string;
  label: string;
  revenue: number;
  count: number;
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
  let target = 10;
  for (const s of [1, 2, 2.5, 5, 10]) {
    if (norm <= s) {
      target = s;
      break;
    }
  }
  return target * pow;
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

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "сделка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "сделки";
  return "сделок";
}

const TOOLTIP_W = 170;

export function RevenueChart({ points }: { points: MonthPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 260;
  const padL = 64;
  const padR = 20;
  const padT = 24;
  const padB = 34;

  const maxV = niceCeil(Math.max(1, ...points.map(p => p.revenue)));
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + innerH - (v / maxV) * innerH;
  const baseline = y(0);
  const yTicks = Array.from({ length: 5 }, (_, i) => (maxV / 4) * i);

  const linePoints = points.map((p, i) => ({ x: x(i), y: y(p.revenue) }));
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
  const hasData = points.some(p => p.count > 0);

  const tooltipLeft = activePoint && active !== null
    ? Math.min(Math.max(padL, x(active) - TOOLTIP_W / 2), Math.max(padL, width - TOOLTIP_W - 8))
    : 0;
  const tooltipTop = activePoint && active !== null
    ? Math.max(2, Math.min(y(activePoint.revenue) - 64, height - 76))
    : 0;

  return (
    <div ref={wrapRef} className="relative">
      {width === 0 ? (
        <div style={{ height }} />
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center text-gray-400" style={{ height }}>
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
              <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
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

            {areaPath && <path d={areaPath} fill="url(#analyticsFill)" />}
            {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

            {lastPoint && (
              <g>
                <circle cx={x(points.length - 1)} cy={y(lastPoint.revenue)} r={8} fill="#2563eb" opacity={0.2} />
                <circle cx={x(points.length - 1)} cy={y(lastPoint.revenue)} r={4.5} fill="#2563eb" />
              </g>
            )}

            {active !== null && activePoint && (
              <g>
                <line x1={x(active)} y1={padT} x2={x(active)} y2={baseline} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={x(active)} cy={y(activePoint.revenue)} r={4} fill="#fff" stroke="#2563eb" strokeWidth={2} />
              </g>
            )}

            {points.map((p, i) => (
              <text key={p.key} x={x(i)} y={padT + innerH + 20} textAnchor="middle" fontSize={11} fill="#94a3b8">{p.label}</text>
            ))}
          </svg>

          {active !== null && activePoint && (
            <div
              className="pointer-events-none absolute z-10 bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2"
              style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_W }}
            >
              <p className="text-[11px] text-gray-400">{activePoint.label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{formatFull(activePoint.revenue)}</p>
              <p className="text-[11px] text-gray-500">{activePoint.count} {plural(activePoint.count)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  "В процессе": "bg-yellow-400",
  "Завершено": "bg-green-500",
  "Отказ": "bg-red-400",
  "Заморожено": "bg-blue-400",
  "Подписание договора": "bg-indigo-400",
  "Оплата": "bg-cyan-400",
  "VIP Клиент": "bg-amber-400",
  "Перспективный": "bg-emerald-400",
  "Думает": "bg-orange-400",
  "Проблемный": "bg-rose-400",
  "Новый собственник": "bg-violet-400",
  "Оценка объекта": "bg-sky-400",
  "Заключение договора": "bg-indigo-500",
  "Упаковка + Маркетинг": "bg-teal-400",
  "Сделка": "bg-green-400",
};

export function StatusBars({ items }: { items: Array<{ status: string; count: number }> }) {
  const total = items.reduce((a, b) => a + b.count, 0);
  if (total === 0) return <p className="text-sm text-gray-400">Нет данных за период</p>;
  return (
    <div className="space-y-3">
      {items.map(it => {
        const pct = Math.round((it.count / total) * 100);
        return (
          <div key={it.status}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">{it.status}</span>
              <span className="text-gray-500">{it.count} · {pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={"h-full rounded-full " + (STATUS_COLORS[it.status] || "bg-gray-400")}
                style={{ width: pct + "%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DONUT_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

export function Donut({ items, valueKey }: { items: Array<Record<string, string | number>>; valueKey: "revenue" | "count" }) {
  const labeled = items.map((it, i) => ({
    label: String(it.type ?? it.category ?? it.status ?? "—"),
    value: Number(it[valueKey] ?? 0),
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
  const total = labeled.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <p className="text-sm text-gray-400">Нет данных за период</p>;

  const R = 60;
  const C = 2 * Math.PI * R;
  const segs = labeled.map((s, i) => {
    const frac = s.value / total;
    const offset = labeled.slice(0, i).reduce((a, b) => a + (b.value / total) * C, 0);
    return { ...s, dash: frac * C, offset };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={150} height={150} viewBox="0 0 150 150" className="shrink-0 -rotate-90">
        <circle cx={75} cy={75} r={R} fill="none" stroke="#f1f5f9" strokeWidth={22} />
        {segs.map(s => (
          <circle
            key={s.label}
            cx={75}
            cy={75}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={22}
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.offset}
          />
        ))}
      </svg>
      <div className="space-y-2 flex-1 min-w-[140px]">
        {labeled.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-gray-700 flex-1">{s.label}</span>
            <span className="text-gray-500">
              {valueKey === "revenue" ? formatCompact(s.value) : s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
