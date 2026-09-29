"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Loader2, Trash2 } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import TaskModal from "@/components/dashboard/TaskModal";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Notification {
  id: number;
  profile_id: number;
  message: string;
  type: string;
  related_to: string;
  related_id: number | null;
  is_read: boolean;
  created_at: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return diffMin + " мин назад";
  if (Math.floor(diffMin / 60) < 24) return Math.floor(diffMin / 60) + " ч назад";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function NotificationsContent() {
  const router = useRouter();
  const { currentProfile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [taskModal, setTaskModal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    // Профиль ещё грузится — не вешаем вечный спиннер, useEffect перезапустит
    // функцию, когда профиль появится.
    if (!currentProfile?.id) { setLoading(false); return; }
    try {
      const res = await fetch("/api/notifications?profile_id=" + currentProfile.id + "&all=1");
      const data = await res.json();
      if (!res.ok) throw new Error((data.error as string) || "Не удалось загрузить уведомления");
      setNotifications(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить уведомления");
    } finally {
      setLoading(false);
    }
  }, [currentProfile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const unread = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error("Не удалось отметить уведомление");
    } catch {
      fetchAll();
    }
  };

  const markAllAsRead = async () => {
    if (!currentProfile?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all: true, profile_id: currentProfile.id }) });
      if (!res.ok) throw new Error("Не удалось отметить уведомления");
    } catch {
      fetchAll();
    }
  };

  const removeOne = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error("Не удалось удалить уведомление");
    } catch {
      fetchAll();
    }
  };

  const [confirmClear, setConfirmClear] = useState(false);
  const removeAll = async () => {
    if (!currentProfile?.id) return;
    setConfirmClear(false);
    setNotifications([]);
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true, profile_id: currentProfile.id }) });
      if (!res.ok) throw new Error("Не удалось удалить уведомления");
    } catch {
      fetchAll();
    }
  };

  const openOne = (n: Notification) => {
    markAsRead(n.id);
    if (n.related_to === "/tasks" && n.related_id) {
      setTaskModal(n.related_id);
      return;
    }
    if (n.type === "activity") {
      router.push(n.related_to && n.related_to.startsWith("/activity") ? n.related_to : "/activity");
      return;
    }
    if (!n.related_to || n.related_to === "/tasks") return;
    router.push(n.related_to);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />Уведомления
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {notifications.length === 0 ? "Пока пусто" : `Всего ${notifications.length}` + (unread > 0 ? ` · непрочитанных: ${unread}` : "")}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unread === 0}
              title={unread === 0 ? "Непрочитанных нет" : "Отметить все как прочитанные"}
              className={
                "px-3.5 py-1.5 rounded-lg text-sm font-medium bg-white border shadow-sm " +
                (unread === 0
                  ? "text-gray-300 cursor-default"
                  : "text-blue-600 hover:bg-blue-50")
              }
            >
              Прочитать все
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-white border shadow-sm text-gray-500 hover:text-red-600 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />Удалить все
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Загрузка…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>Ошибка: {error}</span>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchAll(); }}
            className="text-sm font-medium text-red-700 hover:text-red-900 border border-red-200 rounded-lg px-3 py-1.5 bg-white hover:bg-red-50 shrink-0"
          >
            Повторить
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Уведомлений пока нет</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border divide-y divide-gray-100">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => openOne(n)}
              className={
                "px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-colors group " +
                (n.is_read ? "hover:bg-gray-50" : "bg-blue-50/50 hover:bg-blue-50")
              }
            >
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={"text-sm " + (n.is_read ? "text-gray-600" : "font-medium text-gray-900")}>{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatTime(n.created_at)}</p>
              </div>
              <button
                type="button"
                title="Удалить уведомление"
                onClick={e => { e.stopPropagation(); removeOne(n.id); }}
                className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {taskModal && <TaskModal taskId={taskModal} onClose={() => setTaskModal(null)} />}
      <ConfirmDialog
        open={confirmClear}
        title="Удаление уведомлений"
        message="Удалить все уведомления?"
        hint="Действие необратимо."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={removeAll}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsContent />
    </Suspense>
  );
}
