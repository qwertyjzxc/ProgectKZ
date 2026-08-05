"use server";

import { serviceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export async function adminCreateUser(data: {
  username: string;
  email?: string;
  password: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
  pin?: string;
  phone?: string;
  avatar_color?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: myProfiles } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id);

  if (!myProfiles || !myProfiles.some(p => p.role === "admin")) {
    return { error: "Только администратор может создавать пользователей" };
  }

  const full_name = [data.first_name || "", data.last_name || ""].join(" ").trim() || data.full_name || "";
  const email = (data.email || "").trim() || `${data.username}@crm.local`;

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { username: data.username, full_name },
  });

  if (authError) return { error: authError.message };

  await serviceClient
    .from("profiles")
    .update({
      username: data.username,
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      full_name,
      role: data.role || "user",
      pin: data.pin || "",
      phone: data.phone || "",
      avatar_color: data.avatar_color || "blue",
      password_enc: data.password ? encryptSecret(data.password) : "",
    })
    .eq("user_id", authData.user.id);

  return { success: true };
}

export async function adminDeleteUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: myProfiles } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id);

  if (!myProfiles || !myProfiles.some(p => p.role === "admin")) {
    return { error: "Только администратор может удалять пользователей" };
  }

  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  return { success: true };
}

export async function adminUpdateProfile(profileId: number, data: {
  first_name?: string;
  last_name?: string;
  username?: string;
  password?: string;
  role?: string;
  pin?: string;
  phone?: string;
  avatar_color?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const [myRes, targetRes] = await Promise.all([
    serviceClient.from("profiles").select("role").eq("user_id", user.id),
    serviceClient.from("profiles").select("user_id, username").eq("id", profileId).single(),
  ]);

  if (!myRes.data || !myRes.data.some(p => p.role === "admin")) {
    return { error: "Только администратор может редактировать профили" };
  }

  const target = targetRes.data;
  if (!target) return { error: "Профиль не найден" };

  const update: Record<string, string | number | boolean> = { ...data };
  delete update.password;
  if (data.first_name !== undefined || data.last_name !== undefined) {
    update.full_name = ((data.first_name || "") + " " + (data.last_name || "")).trim();
  }
  const newUsername = data.username !== undefined ? data.username.trim() : "";
  if (newUsername && newUsername !== (target?.username as string)) {
    update.username = newUsername;
  }
  if (data.password) {
    update.password_enc = encryptSecret(data.password);
  }

  const { error } = await serviceClient
    .from("profiles")
    .update(update)
    .eq("id", profileId);

  if (error) return { error: error.message };

  const ownerId = (target?.user_id as string) || "";
  if (ownerId && typeof update.username === "string" && update.username) {
    const { data: authUser } = await serviceClient.auth.admin.getUserById(ownerId);
    const meta = (authUser?.user?.user_metadata || {}) as Record<string, unknown>;
    await serviceClient.auth.admin.updateUserById(ownerId, {
      user_metadata: { ...meta, username: update.username },
    });
  }

  if (data.password) {
    if (data.password.length < 6) return { error: "Пароль должен быть не короче 6 символов" };
    if (ownerId) {
      const { error: authError } = await serviceClient.auth.admin.updateUserById(ownerId, {
        password: data.password,
      });
      if (authError) return { error: authError.message };
    }
  }

  return { success: true };
}

export async function getAllProfiles() {
  const { data } = await serviceClient
    .from("profiles")
    .select("id, user_id, username, first_name, last_name, full_name, role, pin, phone, email, avatar_color, is_active, password_enc")
    .order("created_at", { ascending: false });

  return (data || []).map(({ password_enc, ...rest }) => ({
    ...rest,
    has_password: !!(password_enc as string),
  }));
}

export async function getProfilePassword(profileId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: myProfiles } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id);

  if (!myProfiles || !myProfiles.some(p => p.role === "admin")) {
    return { error: "Только администратор может просматривать пароли" };
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("password_enc")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Пользователь не найден" };
  return { password: decryptSecret((profile.password_enc as string) || "") };
}
