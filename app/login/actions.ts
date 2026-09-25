"use server";

import { createClient } from '@/lib/supabase/server';
import { serviceClient } from '@/lib/supabase/service';

async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(t!);
  }
}

export async function login({ username, password }: { username: string; password: string }) {
  try {
    const name = (username || "").trim();
    if (!name || !password) return { error: "Введите имя и пароль" };

    // Профиль ищем с ретраем: холодный пул Supabase иногда рвёт первый запрос.
    // ВАЖНО: ошибку инфраструктуры нельзя отдавать как "User not found" —
    // иначе невозможно отличить упавшую базу от неверного логина.
    let profile: { email?: string } | null = null;
    type ProfileEmailRow = {
      data: { email?: string } | null;
      error: { code?: string; message?: string } | null;
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, error }: ProfileEmailRow = await withTimeout<ProfileEmailRow>(
          () => serviceClient.from("profiles").select("email").eq("username", name).single() as unknown as Promise<ProfileEmailRow>,
          10000
        );
        if (error) {
          // PGRST116 = строк нет (реально неверный логин), остальное — инфраструктура
          const code = (error as { code?: string }).code;
          if (code === "PGRST116") return { error: "User not found" };
          throw new Error("db: " + (error.message || code || "unknown"));
        }
        profile = data as { email?: string } | null;
        break;
      } catch (e) {
        console.error(`LOGIN profile lookup attempt ${attempt} failed:`, e instanceof Error ? e.message : e);
        if (attempt === 1) return { error: "Нет связи с базой, попробуйте ещё раз" };
      }
    }
    if (!profile) {
      return { error: "Нет связи с базой, попробуйте ещё раз" };
    }

    if (!profile.email) {
      return { error: 'No email in profile' };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error || !data.session) {
      return { error: error?.message || 'Login failed' };
    }

    return { success: true };
  } catch (err) {
    console.error('LOGIN EXCEPTION:', err);
    return { error: 'Internal server error' };
  }
}
