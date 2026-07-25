"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function KzHeader() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
    <header className="bg-white border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-[#2B6AC9]">
          Krisha.kz
        </a>
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <a href="#" className="hover:text-gray-800">Продажа</a>
          <a href="#" className="hover:text-gray-800">Аренда</a>
          <a href="#" className="hover:text-gray-800">Новостройки</a>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {userEmail ? (
            <>
              <span className="text-gray-500">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:underline"
              >
                Выйти
              </button>
            </>
          ) : (
            <a href="/login" className="text-blue-600 hover:underline">
              Войти
            </a>
          )}
          <a
            href="#"
            className="rounded bg-[#FFB800] px-4 py-1.5 font-medium text-white hover:bg-[#e6a600]"
          >
            Подать объявление
          </a>
        </div>
      </div>
    </header>
  );
}
