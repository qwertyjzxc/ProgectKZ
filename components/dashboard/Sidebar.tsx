"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, Users, ListTodo, Handshake, LayoutDashboard, Shield, ChevronDown, Home, Banknote, History, Globe } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { useState, useEffect } from "react";

const clientSubItems = [
  { href: "/clients", label: "Аренда", icon: Home },
  { href: "/clients/sell", label: "Покупка", icon: Banknote },
];

const objectsSubItems = [
  { href: "/dashboard/krisha", label: "С Krisha.kz", icon: Globe },
  { href: "/dashboard/ours", label: "Наши объекты", icon: Building2 },
];

const dealCategories = [
  { id: "arenda", label: "Аренда", icon: Home },
  { id: "pokupka", label: "Покупка", icon: Banknote },
];

const navItems = [
  { href: "/tasks", label: "Задачи", icon: ListTodo },
  { href: "/activity", label: "Журнал действий", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentProfile } = useProfile();
  const [unreadCount, setUnreadCount] = useState(0);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [objectsOpen, setObjectsOpen] = useState(() => pathname.startsWith("/dashboard"));
  const [dealsOpen, setDealsOpen] = useState(() => pathname.startsWith("/deals"));
  const currentHref = pathname + (searchParams.toString() ? "?" + searchParams.toString() : "");

  const fetchUnread = () => {
    if (!currentProfile?.id) return;
    fetch("/api/notifications?profile_id=" + currentProfile.id)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n: { is_read?: boolean }) => !n.is_read).length);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, 15000);
    return () => clearInterval(timer);
  }, [currentProfile?.id, pathname]);

  const allItems = currentProfile?.role === "admin"
    ? [...navItems, { href: "/profiles", label: "Профили", icon: Shield }]
    : navItems;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b bg-blue-600 text-white">
        <LayoutDashboard className="w-5 h-5 mr-3" />
        <span className="font-semibold text-base tracking-tight">kzproject</span>
        {unreadCount > 0 && (
          <span className="ml-auto w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Clients group with expandable sub-items */}
        <div>
          <button
            onClick={() => setClientsOpen(!clientsOpen)}
            className={
              "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors "
              + (pathname.startsWith("/clients")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            <span className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              Клиенты
            </span>
            <ChevronDown className={"w-4 h-4 transition-transform " + (clientsOpen ? "rotate-180" : "")} />
          </button>
          {clientsOpen && (
            <div className="ml-7 mt-1 space-y-1">
              {clientSubItems.map(sub => {
                const isSubActive = pathname === sub.href;
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors "
                      + (isSubActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800")
                    }
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Objects group with expandable sub-items */}
        <div>
          <button
            onClick={() => setObjectsOpen(!objectsOpen)}
            className={
              "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors "
              + (pathname.startsWith("/dashboard")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            <span className="flex items-center gap-3">
              <Building2 className="w-4 h-4" />
              Объекты
            </span>
            <ChevronDown className={"w-4 h-4 transition-transform " + (objectsOpen ? "rotate-180" : "")} />
          </button>
          {objectsOpen && (
            <div className="ml-7 mt-1 space-y-1">
              {objectsSubItems.map(sub => {
                const isSubActive = pathname === sub.href;
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors "
                      + (isSubActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800")
                    }
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Deals group with expandable sub-items */}
        <div>
          <button
            onClick={() => setDealsOpen(!dealsOpen)}
            className={
              "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors "
              + (pathname.startsWith("/deals")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            <span className="flex items-center gap-3">
              <Handshake className="w-4 h-4" />
              Сделки
            </span>
            <ChevronDown className={"w-4 h-4 transition-transform " + (dealsOpen ? "rotate-180" : "")} />
          </button>
          {dealsOpen && (
            <div className="ml-7 mt-1 space-y-1">
              {dealCategories.map(cat => {
                const href = "/deals?category=" + cat.id;
                const isSubActive = currentHref === href;
                const CatIcon = cat.icon;
                return (
                  <Link
                    key={cat.id}
                    href={href}
                    className={
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors "
                      + (isSubActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800")
                    }
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

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
        © 2025 kzproject
      </div>
    </aside>
  );
}
