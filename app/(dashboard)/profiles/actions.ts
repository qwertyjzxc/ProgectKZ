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

  if (!data.password || data.password.length < 6) return { error: "Пароль должен быть не короче 6 символов" };
  const full_name = [data.first_name || "", data.last_name || ""].join(" ").trim() || data.full_name || "";
  const email = (data.email || "").trim() || `${data.username}@crm.local`;

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { username: data.username, full_name },
  });

  if (authError) return { error: authError.message };

  const profileRow = {
    user_id: authData.user.id,
    username: data.username,
    email,
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    full_name,
    role: data.role || "user",
    pin: data.pin || "",
    phone: data.phone || "",
    avatar_color: data.avatar_color || "blue",
    is_active: true,
    password_enc: data.password ? encryptSecret(data.password) : "",
  };
  // В БД может жить триггер handle_new_user, который уже создал строку
  // профиля при создании auth-юзера, а может и не жить. Поэтому INSERT,
  // а при дубле user_id (23505) — UPDATE существующей строки.
  // При любой другой ошибке откатываем auth-юзера, чтобы не было сироты.
  const { error: insertError } = await serviceClient.from("profiles").insert(profileRow);
  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update(profileRow)
        .eq("user_id", authData.user.id);
      if (updateError) {
        await serviceClient.auth.admin.deleteUser(authData.user.id);
        return { error: updateError.message };
      }
    } else {
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return { error: insertError.message };
    }
  }

  return { success: true };
}

export async function adminDeleteUser(profileId: number) {
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

  // Цель ищем по id профиля: у старых/тестовых строк user_id может быть пустым,
  // удаление по user_id их бы не нашло.
  const { data: target } = await serviceClient
    .from("profiles")
    .select("id, user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!target) return { error: "Профиль не найден" };
  const targetUserId = (target.user_id as string) || "";
  if (targetUserId && targetUserId === user.id) {
    return { error: "Нельзя удалить самого себя" };
  }

  // Связи профиля: задачи, уведомления, связки логинов
  await serviceClient.from("task_assignees").delete().eq("assignee_id", profileId);
  await serviceClient.from("notifications").delete().eq("profile_id", profileId);
  if (targetUserId) {
    await serviceClient.from("profile_links").delete().eq("user_id", targetUserId);
  } else {
    await serviceClient.from("profile_links").delete().eq("profile_id", profileId);
  }

  // Auth-юзер: может уже отсутствовать (удалён раньше) — это не ошибка,
  // строку профиля всё равно чистим.
  if (targetUserId) {
    const { error } = await serviceClient.auth.admin.deleteUser(targetUserId);
    if (error && !/not found|not exist|no user/i.test(error.message)) {
      return { error: error.message };
    }
  }

  // Строка профиля: ON DELETE CASCADE из auth.users в живой БД может
  // отсутствовать, поэтому удаляем явно — иначе человек остаётся в списке.
  const { error: profileError } = await serviceClient
    .from("profiles")
    .delete()
    .eq("id", profileId);
  if (profileError) return { error: profileError.message };

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
  // Валидация до любых записей в БД и Auth.
  if (data.password && data.password.length < 6) return { error: "Пароль должен быть не короче 6 символов" };

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

  // Пароль — в Supabase Auth, плюс обратимая копия для просмотра админом.
  if (data.password && ownerId) {
    const { error: authError } = await serviceClient.auth.admin.updateUserById(ownerId, {
      password: data.password,
    });
    if (authError) return { error: authError.message };
  }

  return { success: true };
}

export async function getAllProfiles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: myProfiles } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id);
  if (!myProfiles || !myProfiles.some(p => p.role === "admin")) return [];

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
  const pwd = decryptSecret((profile.password_enc as string) || "");
  if (!pwd) return { error: "Сохранённый пароль не расшифровывается текущим ключом APP_PASSWORD_KEY. Задайте пароль заново через редактирование профиля." };
  return { password: pwd };
}
