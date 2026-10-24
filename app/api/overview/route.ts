import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { unauthorized } from "@/lib/route-auth";

const DEAL_TABLES = ["deals_kvartiry", "deals_pomescheniya", "deals_zemlya"] as const;

// Границы «сегодня» по Алматы (UTC+5, без перехода на летнее время), а не по
// серверному поясу (Vercel=UTC): иначе «задачи на сегодня» сдвинуты на 5 часов.
function almatyDayBounds(): { start: number; end: number } {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).split("-").map(Number);
  const start = Date.UTC(y, m - 1, d) - 5 * 3600_000;
  return { start, end: start + 86_399_999 };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Гейт как в остальных ручках: без сессии — 401, а не частичный ответ
  if (!user) return unauthorized();
  const isAdmin = await isAdminUser(user.id);
  const profileId = Number(request.nextUrl.searchParams.get("profile_id") || 0);

  // Все независимые запросы — параллельно: последовательные await-ы
  // складывали латентность Supabase (по ~200мс каждый) в секунды
  const tasksPromise = (async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,due_date,status,priority")
      .neq("status", "Завершено")
      .order("due_date", { ascending: true });
    if (error) return { data: null as null, error };
    const ids = (data || []).map(t => t.id as number);
    let links: Array<{ task_id: number; assignee_id: number }> = [];
    if (ids.length > 0) {
      // Исполнители отдельно (без FK-embed: работает на любой схеме)
      const { data: linkRows } = await supabase
        .from("task_assignees")
        .select("task_id,assignee_id")
        .in("task_id", ids);
      links = (linkRows || []) as Array<{ task_id: number; assignee_id: number }>;
    }
    return {
      data: (data || []).map(t => ({
        ...t,
        task_assignees: links
          .filter(a => a.task_id === (t.id as number))
          .map(a => ({ assignee_id: a.assignee_id })),
      })),
      error: null,
    };
  })();

  const dealsPromise = isAdmin
    ? Promise.all(
        DEAL_TABLES.map(t =>
          supabase
            .from(t)
            .select("id,name,amount,completed,created_at,category")
            .order("created_at", { ascending: false })
            .limit(3)
        )
      )
    : Promise.resolve([]);

  const dealsCountPromise = isAdmin
    ? Promise.all(
        DEAL_TABLES.map(t =>
          supabase.from(t).select("id", { count: "exact", head: true }).neq("completed", "Завершено").neq("completed", "Сделка").neq("completed", "Отказ")
        )
      )
    : Promise.resolve([]);

  const activityPromise = supabase
    .from("client_activity")
    .select("id,message,client_name,action,created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const [tasksRes, dealsRes, dealsCountRes, activityRes] = await Promise.all([
    tasksPromise,
    dealsPromise,
    dealsCountPromise,
    activityPromise,
  ]);
  const { data: tasksRaw, error: tasksError } = tasksRes;
  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 });

  const tasks = (tasksRaw || []).map(t => ({
    id: t.id as number,
    title: (t.title || "") as string,
    due_date: (t.due_date || "") as string,
    status: (t.status || "") as string,
    priority: (t.priority || "") as string,
    assignee_ids: ((t.task_assignees || []) as Array<{ assignee_id: number }>).map(a => a.assignee_id),
  }));

  const now = Date.now();
  const { start: todayStart, end: todayEnd } = almatyDayBounds();
  const parseDue = (s: string) => {
    const t = Date.parse(s);
    return isNaN(t) ? null : t;
  };

  const overdue = tasks.filter(t => {
    const d = parseDue(t.due_date);
    return d !== null && d < now;
  });
  const dueToday = tasks.filter(t => {
    const d = parseDue(t.due_date);
    return d !== null && d >= todayStart && d <= todayEnd;
  });
  const mine = profileId
    ? tasks.filter(t => t.assignee_ids.includes(profileId))
    : [];

  // Последние сделки по трём таблицам — только админам (данные уже загружены выше параллельно)
  const recentDeals: Array<{ id: number; name: string; amount: number; completed: string; created_at: string; dealType: string; category: string; type: string }> = [];
  let activeTotal = 0;
  if (isAdmin) {
    const tables = [...DEAL_TABLES];
    (dealsRes as Array<{ data: Array<Record<string, unknown>> | null }>).forEach((r, i) => {
      for (const d of r.data || []) {
        recentDeals.push({
          id: d.id as number,
          name: (d.name || "") as string,
          amount: Number(d.amount) || 0,
          completed: (d.completed || "") as string,
          created_at: (d.created_at || "") as string,
          dealType: tables[i],
          // Ключ ветки таблицы (deals_kvartiry → kvartiry) и канон категории:
          // без них ссылка вела в /deals?category=arenda для любой сделки
          type: tables[i].replace(/^deals_/, ""),
          category: d.category === "pokupka" || d.category === "prodaja" ? "pokupka" : "arenda",
        });
      }
    });
    recentDeals.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    for (const r of dealsCountRes as Array<{ count: number | null }>) {
      activeTotal += r.count || 0;
    }
  } // конец if (isAdmin) — сделки только админам

  // Последние события журнала (загружены выше параллельно)
  const { data: activity } = activityRes as { data: Array<Record<string, unknown>> | null };

  return NextResponse.json({
    stats: {
      overdue: overdue.length,
      dueToday: dueToday.length,
      mine: mine.length,
      activeDeals: activeTotal,
    },
    overdue: overdue.slice(0, 5),
    dueToday: dueToday.slice(0, 5),
    mine: mine.slice(0, 6),
    recentDeals: recentDeals.slice(0, 5),
    recentActivity: activity || [],
  });
}
