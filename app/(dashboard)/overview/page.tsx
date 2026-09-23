"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, AlertCircle, CalendarDays, UserCheck, Handshake,
  History, ChevronRight, Loader2, CheckCircle2,
} from "lucide-react";
import { useProfile, profileName } from "@/lib/profile-context";
import { formatMoney } from "@/lib/format";

interface TaskItem {
  id: number;
  title: string;
  due_date: string;
  priority: string;
}

interface DealItem {
  id: number;
  name: string;
  amount: number;
  completed: string;
}

interface ActivityItem {
  id: number;
  message: string;
  client_name: string;
  created_at: string;
}

interface OverviewData {
  stats: { overdue: number; dueToday: number; mine: number; activeDeals: number };
  overdue: TaskItem[];
  dueToday: TaskItem[];
  mine: TaskItem[];
  recentDeals: DealItem[];
  recentActivity: ActivityItem[];
}

const priorityDot: Record<string, string> = {
  "Высокий": "bg-red-500",
  "Средний": "bg-yellow-500",
  "Низкий": "bg-blue-500",
};

function formatDue(s: string): string {
  if (!s) return "без срока";
  const ru = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (ru) return ru[1] + "." + ru[2] + "." + ru[3];
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return diffMin + " мин назад";
  if (Math.floor(diffMin / 60) < 24) return Math.floor(diffMin / 60) + " ч назад";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function TaskRow({ t, accent }: { t: TaskItem; accent?: boolean }) {
  return (
    <Link href="/tasks" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
      <span className={"w-2 h-2 rounded-full shrink-0 " + (priorityDot[t.priority] || "bg-gray-300")} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 truncate">{t.title}</span>
        <span className={"block text-xs mt-0.5 " + (accent ? "text-red-500 font-medium" : "text-gray-400")}>
          {formatDue(t.due_date)}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </Link>
  );
}

function OverviewContent() {
  const router = useRouter();
  const { currentProfile } = useProfile();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const pid = currentProfile?.id ? "?profile_id=" + currentProfile.id : "";
    fetch("/api/overview" + pid)
      .then(async res => {
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) setData(json);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentProfile?.id]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const firstName = (profileName(currentProfile) || "").split(" ")[0];

  const stats = [
    { label: "Просрочено задач", value: data?.stats.overdue ?? "—", icon: AlertCircle, alert: (data?.stats.overdue || 0) > 0, href: "/tasks" },
    { label: "Срок сегодня", value: data?.stats.dueToday ?? "—", icon: CalendarDays, alert: false, href: "/tasks" },
    { label: "Моих задач", value: data?.stats.mine ?? "—", icon: UserCheck, alert: false, href: "/tasks" },
    { label: "Активных сделок", value: data?.stats.activeDeals ?? "—", icon: Handshake, alert: false, href: "/deals?category=arenda" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
          {greeting}{firstName ? ", " + firstName : ""}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })} · вот чем заняться сегодня
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка обзора…
        </div>
      ) : !data ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-sm text-gray-500">
          Не удалось загрузить обзор
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => router.push(s.href)}
                className="bg-white rounded-xl shadow-sm border p-5 text-left hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <s.icon className={"w-4 h-4 " + (s.alert ? "text-red-500" : "text-blue-600")} />
                  {s.label}
                </div>
                <p className={"text-3xl font-bold mt-1.5 " + (s.alert ? "text-red-600" : "text-gray-900")}>{s.value}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />Требуют внимания
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 mb-3">Просроченные и сегодняшние задачи</p>
              {data.overdue.length === 0 && data.dueToday.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4" />Всё чисто — срочных задач нет
                </p>
              ) : (
                <div className="space-y-1">
                  {data.overdue.map(t => <TaskRow key={"o" + t.id} t={t} accent />)}
                  {data.dueToday.filter(t => !data.overdue.some(o => o.id === t.id)).map(t => <TaskRow key={"t" + t.id} t={t} />)}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />Мои задачи
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 mb-3">Назначены на меня · открытые</p>
              {data.mine.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-2">На вас ничего не назначено</p>
              ) : (
                <div className="space-y-1">
                  {data.mine.map(t => <TaskRow key={"m" + t.id} t={t} />)}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-blue-600" />Свежие сделки
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Последние созданные</p>
                </div>
                <Link href="/deals?category=arenda" className="text-sm text-blue-600 hover:underline shrink-0">Все сделки</Link>
              </div>
              {data.recentDeals.length === 0 ? (
                <p className="text-sm text-gray-400">Сделок пока нет</p>
              ) : (
                <div className="space-y-1">
                  {data.recentDeals.map(d => (
                    <Link key={d.id} href="/deals?category=arenda" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{d.name || "Без названия"}</span>
                        <span className="block text-xs text-gray-400 mt-0.5">{d.completed || "—"}</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">{d.amount ? formatMoney(d.amount) : "—"}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />Последние события
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Что делали коллеги</p>
                </div>
                <Link href="/activity" className="text-sm text-blue-600 hover:underline shrink-0">Весь журнал</Link>
              </div>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400">Событий пока нет</p>
              ) : (
                <div className="space-y-1">
                  {data.recentActivity.map(a => (
                    <div key={a.id} className="px-3 py-2.5 rounded-lg">
                      <p className="text-sm text-gray-800">{a.message}{a.client_name ? <span className="text-gray-500"> · {a.client_name}</span> : null}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatTime(a.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewContent />
    </Suspense>
  );
}
