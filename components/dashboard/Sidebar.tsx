"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, Users, ListTodo, Handshake, LayoutDashboard, Shield, ChevronDown, Home, Banknote, History, Globe, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { useState, useEffect, useCallback } from "react";

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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentProfile } = useProfile();
  const [unreadCount, setUnreadCount] = useState(0);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [objectsOpen, setObjectsOpen] = useState(() => pathname.startsWith("/dashboard"));
  const [dealsOpen, setDealsOpen] = useState(() => pathname.startsWith("/deals"));
  const currentHref = pathname + (searchParams.toString() ? "?" + searchParams.toString() : "");

  const fetchUnread = useCallback(() => {
    if (!currentProfile?.id) return;
    fetch("/api/notifications?profile_id=" + currentProfile.id)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n: { is_read?: boolean }) => !n.is_read).length);
        }
      })
      .catch(() => {});
  }, [currentProfile]);

  useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, 15000);
    return () => clearInterval(timer);
  }, [fetchUnread, pathname]);

  const allItems = currentProfile?.role === "admin"
    ? [...navItems, { href: "/profiles", label: "Профили", icon: Shield }]
    : navItems;

  const expandAndOpen = (group: "clients" | "objects" | "deals") => {
    if (collapsed) onToggle();
    if (group === "clients") setClientsOpen(true);
    if (group === "objects") setObjectsOpen(true);
    if (group === "deals") setDealsOpen(true);
  };

  return (
    <aside className={"fixed left-0 top-0 h-screen bg-white border-r flex flex-col z-30 transition-[width] duration-200 " + (collapsed ? "w-16" : "w-64")}>
      {/* Logo */}
      <div className={"h-16 flex items-center border-b bg-blue-600 text-white " + (collapsed ? "justify-center px-0" : "px-4")}>
        <LayoutDashboard className={"shrink-0 " + (collapsed ? "w-5 h-5" : "w-5 h-5 mr-3")} />
        {!collapsed && <span className="font-semibold text-base tracking-tight">kzproject</span>}
        {!collapsed && unreadCount > 0 && (
          <span className="ml-auto w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Развернуть" : "Свернуть"}
          className={"ml-auto w-9 h-9 flex items-center justify-center rounded-lg text-white bg-blue-700/60 hover:bg-blue-800 transition-colors " + (collapsed ? "mx-auto" : "")}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={"flex-1 overflow-y-auto overflow-x-hidden py-4 " + (collapsed ? "px-2 space-y-1" : "px-3 space-y-1")}>
        {/* Clients group */}
        <div>
          <button
            onClick={() => (collapsed ? expandAndOpen("clients") : setClientsOpen(!clientsOpen))}
            title="Клиенты"
            className={
              "w-full flex items-center justify-between text-sm rounded-lg transition-colors "
              + (collapsed ? "px-0 justify-center h-10 "
              : "px-3 py-2.5 ")
              + (pathname.startsWith("/clients")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            <span className={"flex items-center " + (collapsed ? "gap-0" : "gap-3")}>
              <Users className="w-4 h-4 shrink-0" />
              {!collapsed && <>Клиенты</>}
            </span>
            {!collapsed && <ChevronDown className={"w-4 h-4 transition-transform " + (clientsOpen ? "rotate-180" : "")} />}
          </button>
          {!collapsed && clientsOpen && (
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

        {/* Objects group */}
        <div>
          <button
            onClick={() => (collapsed ? expandAndOpen("objects") : setObjectsOpen(!objectsOpen))}
            title="Объекты"
            className={
              "w-full flex items-center justify-between text-sm rounded-lg transition-colors "
              + (collapsed ? "px-0 justify-center h-10 "
              : "px-3 py-2.5 ")
              + (pathname.startsWith("/dashboard")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            <span className={"flex items-center " + (collapsed ? "gap-0" : "gap-3")}>
              <Building2 className="w-4 h-4 shrink-0" />
              {!collapsed && <>Объекты</>}
            </span>
            {!collapsed && <ChevronDown className={"w-4 h-4 transition-transform " + (objectsOpen ? "rotate-180" : "")} />}
          </button>
          {!collapsed && objectsOpen && (
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

        {/* Deals group */}
        <div>
          <button
            onClick={() => (collapsed ? expandAndOpen("deals") : setDealsOpen(!dealsOpen))}
            title="Сделки"
            className={
              "w-full flex items-center justify-between text-sm rounded-lg transition-colors "
              + (collapsed ? "px-0 justify-center h-10 "
              : "px-3 py-2.5 ")
              + (pathname.startsWith("/deals")
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            <span className={"flex items-center " + (collapsed ? "gap-0" : "gap-3")}>
              <Handshake className="w-4 h-4 shrink-0" />
              {!collapsed && <>Сделки</>}
            </span>
            {!collapsed && <ChevronDown className={"w-4 h-4 transition-transform " + (dealsOpen ? "rotate-180" : "")} />}
          </button>
          {!collapsed && dealsOpen && (
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
              title={collapsed ? item.label : undefined}
              className={
                "flex items-center justify-between text-sm rounded-lg transition-colors "
                + (collapsed ? "px-0 justify-center h-10 "
                : "px-3 py-2.5 ")
                + (isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
              }
            >
              <span className={"flex items-center " + (collapsed ? "gap-0" : "gap-3")}>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <>{item.label}</>}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={"border-t flex items-center " + (collapsed ? "p-2 justify-center" : "p-4")}>
        <span className="text-xs text-gray-400">{collapsed ? "" : "© 2025 kzproject"}</span>
      </div>
    </aside>
  );
}