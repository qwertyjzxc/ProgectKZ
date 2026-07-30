"use server";

import { serviceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function adminCreateUser(data: {
  username: string;
  email?: string;
  password: string;
  full_name?: string;
  role?: string;
  pin?: string;
  phone?: string;
  avatar_color?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Только администратор может создавать пользователей" };
  }

  const email = data.email || `${data.username}@crm.local`;

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { username: data.username, full_name: data.full_name || "" },
  });

  if (authError) return { error: authError.message };

  await serviceClient
    .from("profiles")
    .update({
      username: data.username,
      full_name: data.full_name || "",
      role: data.role || "user",
      pin: data.pin || "",
      phone: data.phone || "",
      avatar_color: data.avatar_color || "blue",
    })
    .eq("user_id", authData.user.id);

  return { success: true };
}

export async function adminDeleteUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Только администратор может удалять пользователей" };
  }

  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  return { success: true };
}

export async function adminUpdateProfile(userId: string, data: {
  full_name?: string;
  role?: string;
  pin?: string;
  phone?: string;
  avatar_color?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Только администратор может редактировать профили" };
  }

  const { error } = await serviceClient
    .from("profiles")
    .update(data)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getAllProfiles() {
  return await serviceClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .then(({ data }) => data || []);
}
