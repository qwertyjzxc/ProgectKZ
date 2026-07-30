"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell, RotateCcw, X, Check, Shield, Settings, LogOut } from "lucide-react";
import { useProfile } from "@/lib/profile-context";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentProfile, profiles, setCurrentProfile } = useProfile();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = () => {
    if (!currentProfile?.id) { setNotifications([]); setUnreadCount(0); return; }
    fetch("/api/notifications?profile_id=" + currentProfile.id)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter((n: any) => !n.is_read).length);
        }
      })
      .catch(() => {});
  };

  useEffect(() => { fetchNotifications(); }, [currentProfile?.id]);

  const markAsRead = async (id: number) => {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!currentProfile?.id) return;
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all: true, profile_id: currentProfile.id }) });
    fetchNotifications();
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) params.set("search", searchValue); else params.delete("search");
    router.push(pathname + "?" + params.toString());
  };

  const handleResetFilters = () => { router.push(pathname); setSearchValue(""); };

  const avatarColor = currentProfile?.avatar_color || "blue";
  const initials = currentProfile?.full_name
    ? currentProfile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

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
      <form onSubmit={handleSearch} className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input name="search" placeholder="Поиск" value={searchValue} onChange={e => setSearchValue(e.target.value)} className="pl-10 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white" />
      </form>
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={handleResetFilters} className="gap-1 text-xs"><RotateCcw className="w-3.5 h-3.5" /> Сбросить</Button>

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
            <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold " + profileAvatarClass}>
              {initials}
            </div>
            <span className="hidden sm:inline font-medium">{currentProfile?.full_name || "Гость"}</span>
            {currentProfile?.role === "admin" && <Shield className="w-3.5 h-3.5 text-yellow-500" title="Администратор" />}
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-11 w-64 bg-white rounded-xl shadow-xl border z-40 p-2">
                <div className="px-3 py-2 border-b mb-1">
                  <p className="text-sm font-semibold text-gray-800">{currentProfile?.full_name}</p>
                  <p className="text-xs text-gray-500">{currentProfile?.role === "admin" ? "Администратор" : "Сотрудник"}</p>
                </div>

                <p className="px-3 py-1 text-xs text-gray-400 font-semibold uppercase">Переключить профиль</p>
                {profiles.filter(p => p.id !== currentProfile?.id).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setCurrentProfile(p); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold " + (colorMap[p.avatar_color] || colorMap.blue)}>
                      {p.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <span>{p.full_name}</span>
                    {p.role === "admin" && <Shield className="w-3 h-3 text-yellow-500 ml-auto" />}
                    {currentProfile?.id === p.id && <Check className="w-4 h-4 text-blue-500 ml-auto" />}
                  </button>
                ))}

                <hr className="my-1" />
                {currentProfile?.role === "admin" && (
                  <button
                    onClick={() => { router.push("/profiles"); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-left"
                  >
                    <Settings className="w-4 h-4" />
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
    </header>
  );
}
