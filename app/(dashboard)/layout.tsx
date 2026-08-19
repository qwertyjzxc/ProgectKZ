import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/Header";
import { ProfileProvider } from "@/lib/profile-context";
import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <div className="flex h-screen bg-gray-100">
        <Suspense>
          <Sidebar />
        </Suspense>
        <div className="ml-64 flex-1 flex flex-col min-w-0">
          <Suspense>
            <DashboardHeader />
          </Suspense>
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ProfileProvider>
  );
}
