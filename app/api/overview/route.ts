import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

const DEAL_TABLES = ["deals_kvartiry", "deals_pomescheniya", "deals_zemlya"] as const;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user ? await isAdminUser(user.id) : false;
  const profileId = Number(request.nextUrl.searchParams.get("profile_id") || 0);

  // Задачи с исполнителями
  const { data: tasksRaw, error: tasksError } = await supabase
    .from("tasks")
    .select("id,title,due_date,status,priority,task_assignees(assignee_id)")
    .neq("status", "Завершено")
    .order("due_date", { ascending: true });
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
  const todayStart = startOfToday().getTime();
  const todayEnd = endOfToday().getTime();
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

  // Последние сделки по трём таблицам
  // Последние сделки — только админам
  const recentDeals: Array<{ id: number; name: string; amount: number; completed: string; created_at: string; dealType: string }> = [];
  let activeTotal = 0;
  if (isAdmin) {
  for (const table of DEAL_TABLES) {
    const { data } = await supabase
      .from(table)
      .select("id,name,amount,completed,created_at")
      .order("created_at", { ascending: false })
      .limit(3);
    for (const d of data || []) {
      recentDeals.push({
        id: d.id as number,
        name: (d.name || "") as string,
        amount: Number(d.amount) || 0,
        completed: (d.completed || "") as string,
        created_at: (d.created_at || "") as string,
        dealType: table,
      });
    }
  }
  recentDeals.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

  for (const table of DEAL_TABLES) {
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).neq("completed", "Завершено").neq("completed", "Отказ");
    activeTotal += count || 0;
  }
  } // конец if (isAdmin) — сделки только админам

  // Последние события журнала
  const { data: activity } = await supabase
    .from("client_activity")
    .select("id,message,client_name,action,created_at")
    .order("created_at", { ascending: false })
    .limit(6);

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
