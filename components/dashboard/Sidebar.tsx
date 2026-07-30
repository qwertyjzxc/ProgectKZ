"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, ListTodo, Handshake, LayoutDashboard, Shield, Bell } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Объекты", icon: Building2 },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/tasks", label: "Задачи", icon: ListTodo },
  { href: "/deals", label: "Сделки", icon: Handshake },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentProfile } = useProfile();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentProfile?.id) return;
    fetch("/api/notifications?profile_id=" + currentProfile.id)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n: any) => !n.is_read).length);
        }
      })
      .catch(() => {});
  }, [currentProfile?.id]);

  const allItems = currentProfile?.role === "admin"
    ? [...navItems, { href: "/profiles", label: "Профили", icon: Shield }]
    : navItems;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b bg-blue-600 text-white">
        <LayoutDashboard className="w-5 h-5 mr-3" />
        <span className="font-semibold text-base tracking-tight">Romanov Estate</span>
        {unreadCount > 0 && (
          <span className="ml-auto w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {allItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors "
                + (isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 text-xs text-gray-400">
        © 2025 Romanov Estate
      </div>
    </aside>
  );
}
