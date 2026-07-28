"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, Menu, LogOut, User, Plus } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b shadow-sm">
      <div className="mx-auto max-w-full px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 group shrink-0">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
            CRM
          </span>
        </a>

        {/* Right side */}
        <div className="flex items-center gap-3 text-sm">
          {userEmail ? (
            <>
              <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                <User className="w-4 h-4" />
                <span className="text-xs">{userEmail.split('@')[0]}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Выйти
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => router.push("/login")} className="gap-1">
              <User className="w-3.5 h-3.5" />
              Войти
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
