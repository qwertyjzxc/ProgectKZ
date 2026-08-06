"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Check, Shield, Settings, LogOut, UserCog, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile, profileName, profileInitials, type Profile } from "@/lib/profile-context";
import AddProfileModal from "./AddProfileModal";
import { detachProfile } from "@/lib/profile-actions";

interface Notification {
  id: number;
  profile_id: number;
  message: string;
  type: string;
  related_to: string;
  is_read: boolean;
  created_at: string;
}

export default function DashboardHeader() {
  const router = useRouter();
  const { currentProfile, profiles, setCurrentProfile, refreshProfiles, loading } = useProfile();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [detachTarget, setDetachTarget] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const applyNotifications = useCallback((list: Notification[]) => {
    setNotifications(list);
    setUnreadCount(list.filter(n => !n.is_read).length);
  }, []);

  const fetchNotifications = useCallback(() => {
    if (!currentProfile?.id) return;
    fetch("/api/notifications?profile_id=" + currentProfile.id)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) applyNotifications(data);
      })
      .catch(() => {});
  }, [currentProfile, applyNotifications]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Периодическое обновление — новые уведомления появляются живьём,
  // прочитанные исчезают без перезагрузки страницы
  useEffect(() => {
    const timer = setInterval(fetchNotifications, 60000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    // Оптимистично помечаем прочитанным сразу
    applyNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      const res = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error("Ошибка");
    } catch {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!currentProfile?.id) return;
    applyNotifications(notifications.map(n => ({ ...n, is_read: true })));
    try {
      const res = await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all: true, profile_id: currentProfile.id }) });
      if (!res.ok) throw new Error("Ошибка");
    } catch {
      fetchNotifications();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "только что";
    if (diffMin < 60) return diffMin + " мин назад";
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return diffHours + " ч назад";
    return date.toLocaleDateString("ru-RU");
  };

  const handleDetach = async () => {
    const p = detachTarget;
    if (!p) return;
    setDetachTarget(null);
    const result = await detachProfile(p.id);
    if (!result?.success) {
      window.alert(result?.error || "Не удалось выйти из профиля");
      return;
    }
    const list = await refreshProfiles();
    if (currentProfile?.id === p.id) {
      setCurrentProfile(list[0] || null);
    }
    setShowProfileMenu(false);
    fetchNotifications();
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
    <header className="sticky top-0 z-20 bg-white border-b h-16 flex items-center px-6 gap-3">
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
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border z-40 p-2 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b mb-1 sticky top-0 bg-white rounded-t-xl z-10">
                  <span className="font-semibold text-sm">Уведомления</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Прочитать все</button>
                    )}
                    <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                </div>

                {notifications.length === 0 && (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Уведомлений пока нет</p>
                  </div>
                )}

                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={
                      "px-3 py-3 rounded-lg cursor-pointer transition-colors mb-0.5 " +
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
                    </div>
                  </div>
                ))}
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

                {profiles.length > 1 && (
                  <>
                    <p className="px-3 py-1 text-xs text-gray-400 font-semibold uppercase">Мои профили</p>
                    {profiles.map(p => (
                      <div key={p.id} className="group flex items-center rounded-lg hover:bg-gray-50">
                        <button
                          onClick={() => { setCurrentProfile(p); setShowProfileMenu(false); }}
                          className="flex-1 flex items-center gap-2 px-3 py-1.5 text-sm text-left min-w-0"
                        >
                          <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 " + (colorMap[p.avatar_color] || colorMap.blue)}>
                            {profileInitials(profileName(p))}
                          </div>
                          <span className="truncate">{profileName(p) || p.username}</span>
                          {p.role === "admin" && <Shield className="w-3 h-3 text-yellow-500 shrink-0" />}
                          {currentProfile?.id === p.id && <Check className="w-4 h-4 text-blue-500 shrink-0 ml-auto" />}
                        </button>
                        {p.is_linked ? (
                          <button
                            onClick={() => setDetachTarget(p)}
                            title="Выйти из профиля"
                            className="mr-1 p-1.5 text-red-500 rounded-md hover:text-red-700 hover:bg-red-50 transition-colors shrink-0"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="mr-1 w-[30px] shrink-0" />
                        )}
                      </div>
                    ))}
                  </>
                )}

                <button
                  onClick={() => { setShowAddProfile(true); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-left"
                >
                  <UserPlus className="w-4 h-4" />
                  Добавить профиль
                </button>

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

      {showAddProfile && (
        <AddProfileModal
          isAdmin={profiles.some(p => p.role === "admin")}
          onClose={() => setShowAddProfile(false)}
          onAttached={async (profileId: number) => {
            setShowAddProfile(false);
            const list = await refreshProfiles();
            const added = list.find(x => x.id === profileId);
            if (added) setCurrentProfile(added);
          }}
        />
      )}

      {detachTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetachTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Выйти из профиля?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Вы выйдете из профиля <span className="font-semibold text-gray-700">«{profileName(detachTarget) || detachTarget.username}»</span>. Профиль будет удалён из списка «Мои профили».
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDetachTarget(null)}>Отмена</Button>
              <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDetach}>Выйти</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
