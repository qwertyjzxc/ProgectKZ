import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity, buildChanges, buildUpdateMessage, TASK_LABELS } from "@/lib/activity";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data: existing } = await supabase
    .from("tasks")
    .select("*, task_assignees(assignee_id)")
    .eq("id", id)
    .single();

  const existingAssignees = Array.isArray(existing?.task_assignees)
    ? (existing.task_assignees as Array<{ assignee_id: number }>).map(a => a.assignee_id)
    : [];

  const newStatus = body.status ?? existing?.status;
  const completedAt =
    newStatus === "Завершено"
      ? existing?.status === "Завершено"
        ? existing.completed_at
        : new Date().toISOString()
      : null;

  const { data, error } = await supabase.from("tasks").update({
    title: body.title ?? existing?.title,
    client: body.client ?? existing?.client,
    description: body.description ?? existing?.description,
    created_date: body.created_date ?? existing?.created_date,
    due_date: (body.dueDate || body.due_date) ?? existing?.due_date,
    priority: body.priority ?? existing?.priority,
    status: newStatus,
    completed_at: completedAt,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let newAssignees = existingAssignees;
  if (body.assignee_ids !== undefined) {
    newAssignees = Array.isArray(body.assignee_ids)
      ? [...new Set((body.assignee_ids as unknown[]).map(a => Number(a)).filter((n): n is number => Boolean(n)))]
      : [];
    await supabase.from("task_assignees").delete().eq("task_id", id);
    if (newAssignees.length) {
      const { error: linkError } = await supabase.from("task_assignees").insert(
        newAssignees.map(aid => ({ task_id: Number(id), assignee_id: aid }))
      );
      if (linkError) console.error("Ошибка назначения исполнителей:", linkError.message);
    }
  }

  const newlyAdded = newAssignees.filter(aid => !existingAssignees.includes(aid));
  for (const aid of newlyAdded) {
    void (async () => {
      const { error: notifyError } = await supabase.from("notifications").insert({
        profile_id: aid,
        message: "Вам назначена задача: «" + (data.title || "") + "»",
        type: "task",
        related_to: "/tasks",
        related_id: Number(id),
      });
      if (notifyError) console.error("Ошибка уведомления о задаче:", notifyError.message);
    })();
  }

  const oldRow = { ...existing, assignee_ids: existingAssignees };
  const newRow = { ...data, assignee_ids: newAssignees };
  const changes = buildChanges(oldRow, newRow, TASK_LABELS);
  if (changes.length > 0) {
    await logActivity({
      client_table: "tasks",
      client_id: data.id,
      client_name: data.title || existing?.title || "",
      action: "update",
      message: buildUpdateMessage(changes),
      changes,
    });
  }

  return NextResponse.json({ ...data, assignee_ids: newAssignees });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { data: existing } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (existing) {
    await logActivity({
      client_table: "tasks",
      client_id: existing.id,
      client_name: existing.title || "",
      action: "delete",
      message: "Удалил задачу",
      changes: buildChanges(existing, {}, TASK_LABELS),
    });
  }
  return NextResponse.json({ success: true });
}
