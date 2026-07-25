"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, Menu, LogOut, User, Plus, ChevronDown } from "lucide-react";

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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
            KZdom
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
            Продажа
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
            Аренда
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
            Новостройки
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
            Коммерческая
          </a>
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3 text-sm">
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
          <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm hover:shadow-md transition-all duration-200 gap-1">
            <Plus className="w-3.5 h-3.5" />
            Подать объявление
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-3">
          <nav className="flex flex-col gap-2">
            <a href="#" className="text-gray-600 py-2 hover:text-blue-600">Продажа</a>
            <a href="#" className="text-gray-600 py-2 hover:text-blue-600">Аренда</a>
            <a href="#" className="text-gray-600 py-2 hover:text-blue-600">Новостройки</a>
            <a href="#" className="text-gray-600 py-2 hover:text-blue-600">Коммерческая</a>
          </nav>
          <hr />
          <div className="flex flex-col gap-2">
            {userEmail ? (
              <>
                <span className="text-sm text-gray-500">{userEmail}</span>
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-500">Выйти</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => router.push("/login")}>Войти</Button>
            )}
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500">Подать объявление</Button>
          </div>
        </div>
      )}
    </header>
  );
}
