import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, TASK_LABELS } from "@/lib/activity";

const COMPLETED_TTL_MS = 10 * 60 * 1000;

export async function GET() {
  const supabase = await createClient();

  // Автоудаление задач, завершённых более 10 минут назад
  const cutoff = new Date(Date.now() - COMPLETED_TTL_MS).toISOString();
  await supabase
    .from("tasks")
    .delete()
    .eq("status", "Завершено")
    .lt("completed_at", cutoff);

  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_assignees(assignee_id)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const normalized = (data || []).map(t => ({
    ...t,
    assignee_ids: ((t.task_assignees || []) as Array<{ assignee_id: number }>).map(a => a.assignee_id),
    task_assignees: undefined,
  }));
  return NextResponse.json(normalized);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const status = body.status || "В работе";
  const assigneeIds = Array.isArray(body.assignee_ids)
    ? [...new Set(body.assignee_ids.map(Number).filter(Boolean))]
    : [];
  const { data, error } = await supabase.from("tasks").insert({
    title: body.title,
    client: body.client || "",
    description: body.description || "",
    created_date: body.created_date || "",
    due_date: body.due_date || "",
    priority: body.priority || "Средний",
    status,
    completed_at: status === "Завершено" ? new Date().toISOString() : null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (assigneeIds.length) {
    const { error: linkError } = await supabase.from("task_assignees").insert(
      assigneeIds.map(aid => ({ task_id: data.id, assignee_id: aid }))
    );
    if (linkError) console.error("Ошибка назначения исполнителей:", linkError.message);
  }

  for (const aid of assigneeIds) {
    void (async () => {
      const { error: notifyError } = await supabase.from("notifications").insert({
        profile_id: aid,
        message: "Вам назначена задача: «" + (data.title || "") + "»",
        type: "task",
        related_to: "/tasks",
        related_id: data.id,
      });
      if (notifyError) console.error("Ошибка уведомления о задаче:", notifyError.message);
    })();
  }

  await logActivity({
    client_table: "tasks",
    client_id: data.id,
    client_name: data.title || "",
    action: "create",
    message: "Добавил задачу",
    changes: buildChanges({}, { ...data, assignee_ids: assigneeIds }, TASK_LABELS),
  });

  return NextResponse.json({ ...data, assignee_ids: assigneeIds }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(Number).filter((n: number) => Number.isFinite(n) && n > 0) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Нет выбранных задач" }, { status: 400 });
  const { data: existing } = await supabase.from("tasks").select("id, title").in("id", ids);
  const { error } = await supabase.from("tasks").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (ids.length === 1 && existing?.[0]) {
    await logActivity({
      client_table: "tasks",
      client_id: existing[0].id,
      client_name: existing[0].title || "",
      action: "delete",
      message: "Удалил задачу",
    });
  } else {
    await logActivity({
      client_table: "tasks",
      client_id: 0,
      client_name: "",
      action: "delete",
      message: `Удалил ${ids.length} задач`,
    });
  }
  return NextResponse.json({ success: true, deleted: ids.length });
}
