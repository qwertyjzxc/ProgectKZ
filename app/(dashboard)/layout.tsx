"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/Header";
import { ProfileProvider } from "@/lib/profile-context";
import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <ProfileProvider>
      <div className="flex h-screen bg-gray-100">
        <Suspense>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        </Suspense>
        <div className={(collapsed ? "ml-16 " : "ml-64 ") + "flex-1 flex flex-col min-w-0 transition-[margin] duration-200"}>
          <Suspense>
            <DashboardHeader />
          </Suspense>
          <main className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
            {children}
          </main>
        </div>
      </div>
    </ProfileProvider>
  );
}