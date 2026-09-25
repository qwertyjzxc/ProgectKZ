"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Shield, Settings, LogOut, UserCog } from "lucide-react";
import { useProfile, profileName, profileInitials } from "@/lib/profile-context";
import TaskModal from "./TaskModal";
import GlobalSearch from "./GlobalSearch";

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

export default function DashboardHeader() {
  const router = useRouter();
  const { currentProfile, loading } = useProfile();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [taskModal, setTaskModal] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(() => {
    if (!currentProfile?.id) return;
    fetch("/api/notifications?profile_id=" + currentProfile.id + "&count=1")
      .then(res => res.json())
      .then(data => {
        if (typeof data?.unread === "number") setUnreadCount(data.unread);
      })
      .catch(() => {});
  }, [currentProfile]);

  const fetchNotifications = useCallback(() => {
    if (!currentProfile?.id) return;
    // Список для дропдауна (первые 20) и лёгкий счётчик для бейджа — вместо выгрузки всех 500
    fetch("/api/notifications?profile_id=" + currentProfile.id)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
    fetchUnread();
  }, [currentProfile, fetchUnread]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Периодическое обновление — новые уведомления появляются живьём,
  // прочитанные исчезают без перезагрузки страницы
  useEffect(() => {
    const timer = setInterval(fetchNotifications, 60000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    // Оптимистично помечаем прочитанным сразу
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    fetchUnread();
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error("Ошибка");
    } catch {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!currentProfile?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all: true, profile_id: currentProfile.id }) });
      if (!res.ok) throw new Error("Ошибка");
    } catch {
      fetchNotifications();
    }
  };

  const removeNotification = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    fetchUnread();
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error("Ошибка");
    } catch {
      fetchNotifications();
    }
  };

  const removeAllNotifications = async () => {
    if (!currentProfile?.id) return;
    if (!window.confirm("Удалить все уведомления?")) return;
    setNotifications([]);
    setUnreadCount(0);
    window.dispatchEvent(new Event("notifications-updated"));
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true, profile_id: currentProfile.id }) });
      if (!res.ok) throw new Error("Ошибка");
    } catch {
      fetchNotifications();
    }
  };

  // Куда вести по уведомлению:
  // - задачи с id — в карточку задачи;
  // - type "activity" (действие сотрудника) — в журнал с раскрытой веткой;
  // - остальное (сущность: клиент/сделка/объект) — прямо в её карточку.
  const openNotification = (n: Notification) => {
    markAsRead(n.id);
    if (n.related_to === "/tasks" && n.related_id) {
      setTaskModal(n.related_id);
      return;
    }
    if (n.type === "activity") {
      setShowNotifications(false);
      router.push(n.related_to && n.related_to.startsWith("/activity") ? n.related_to : "/activity");
      return;
    }
    if (!n.related_to || n.related_to === "/tasks") return;
    setShowNotifications(false);
    router.push(n.related_to);
  };

  const formatTime = (dateStr: string) => {    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "только что";
    if (diffMin < 60) return diffMin + " мин назад";
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return diffHours + " ч назад";
    return date.toLocaleDateString("ru-RU");
  };

  const avatarColor = currentProfile?.avatar_color || "blue";
  const initials = profileInitials(profileName(currentProfile));
  const currentDisplayName = loading
    ? ""
    : profileName(currentProfile) || "Гость";

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-600",
    teal: "bg-teal-100 text-teal-600",
    pink: "bg-pink-100 text-pink-600",
  };

  const profileAvatarClass = colorMap[avatarColor] || colorMap.blue;

  return (
    <header className="relative z-20 bg-white border-b h-16 flex items-center px-6 gap-3 shrink-0">
      <GlobalSearch />
      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); fetchNotifications(); }}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-xl border z-40 p-2 max-h-96 overflow-y-auto overflow-x-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b mb-1 bg-white rounded-t-xl gap-2">
                  <span className="font-semibold text-sm shrink-0">Уведомления</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      title={unreadCount === 0 ? "Непрочитанных нет" : "Отметить все как прочитанные"}
                      className={
                        "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap " +
                        (unreadCount === 0
                          ? "text-gray-300 border-gray-100 cursor-default"
                          : "text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100")
                      }
                    >
                      Прочитать все
                    </button>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={removeAllNotifications}
                        title="Удалить все уведомления"
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        Удалить все
                      </button>
                    )}
                  </div>
                </div>

                {notifications.length === 0 && (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Уведомлений пока нет</p>
                  </div>
                )}

                {notifications.slice(0, 20).map(n => (
                  <div
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={
                      "px-3 py-3 rounded-lg cursor-pointer transition-colors mb-0.5 group " +
                      (n.is_read
                        ? "text-gray-500 hover:bg-gray-50"
                        : "font-medium text-gray-800 bg-blue-50/50 hover:bg-blue-50")
                    }
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTime(n.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        title="Удалить уведомление"
                        onClick={e => { e.stopPropagation(); removeNotification(n.id); }}
                        className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowNotifications(false); router.push("/notifications"); }}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2.5 border-t mt-1"
                  >
                    Показать все ({notifications.length})
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Profile Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-1.5"
          >
            {loading ? (
              <>
                <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
                <span className="hidden sm:inline w-24 h-3.5 bg-gray-200 rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold " + profileAvatarClass}>
                  {initials}
                </div>
                <span className="hidden sm:inline font-medium">{currentDisplayName}</span>
              </>
            )}
            {currentProfile?.role === "admin" && <Shield className="w-3.5 h-3.5 text-yellow-500" aria-label="Администратор" />}
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-11 w-64 bg-white rounded-xl shadow-xl border z-40 p-2">
                <div className="px-3 py-2 border-b mb-1">
                  <p className="text-sm font-semibold text-gray-800">{profileName(currentProfile) || "Гость"}</p>
                  <p className="text-xs text-gray-500">{currentProfile?.role === "admin" ? "Администратор" : "Сотрудник"}</p>
                </div>

                <hr className="my-1" />
                <button
                  onClick={() => { router.push("/settings"); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-left"
                >
                  <Settings className="w-4 h-4" />
                  Настройки профиля
                </button>
                {currentProfile?.role === "admin" && (
                  <button
                    onClick={() => { router.push("/profiles"); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-left"
                  >
                    <UserCog className="w-4 h-4" />
                    Управление профилями
                  </button>
                )}
                <button
                  onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-red-50 text-left text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {taskModal && <TaskModal taskId={taskModal} onClose={() => setTaskModal(null)} />}
    </header>
  );
}
