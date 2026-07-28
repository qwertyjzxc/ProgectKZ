"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function login({ username, password }: { username: string; password: string }) {
  const lookupClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await lookupClient
    .from("profiles")
    .select("email")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return { error: "Пользователь не найден" };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await authClient.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (error || !data.session) {
    return { error: error?.message || "Ошибка входа" };
  }

  const cookieStore = await cookies();
  cookieStore.set("sb-access-token", data.session.access_token, {
    path: "/",
    maxAge: data.session.expires_in,
    httpOnly: true,
    sameSite: "lax",
  });
  cookieStore.set("sb-refresh-token", data.session.refresh_token, {
    path: "/",
    maxAge: data.session.expires_in,
    httpOnly: true,
    sameSite: "lax",
  });

  return { success: true };
}
