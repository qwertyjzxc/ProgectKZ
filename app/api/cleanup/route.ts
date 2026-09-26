import { NextRequest, NextResponse } from "next/server";
import { requireCronOrAdmin } from "@/lib/route-auth";
import { serviceClient } from "@/lib/supabase/service";

export const maxDuration = 60;

// Фоновая чистка мусора — ТОЛЬКО крон по CRON_SECRET или админ вручную.
// Раньше это делалось внутри GET /api/tasks и GET /api/notifications
// (запись при чтении + неявная потеря данных), теперь — явный эндпоинт.
const COMPLETED_TASKS_TTL_MS = 10 * 60 * 1000;
const NOTIFICATIONS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { denied } = await requireCronOrAdmin(request);
  if (denied) return denied;
  const tasksCutoff = new Date(Date.now() - COMPLETED_TASKS_TTL_MS).toISOString();
  const notifCutoff = new Date(Date.now() - NOTIFICATIONS_TTL_MS).toISOString();
  const [tasksRes, notifRes] = await Promise.all([
    serviceClient.from("tasks").delete().eq("status", "Завершено").lt("completed_at", tasksCutoff).select("id"),
    serviceClient.from("notifications").delete().lt("created_at", notifCutoff).select("id"),
  ]);
  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 });
  if (notifRes.error) return NextResponse.json({ error: notifRes.error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    deletedTasks: tasksRes.data?.length ?? 0,
    deletedNotifications: notifRes.data?.length ?? 0,
  });
}
