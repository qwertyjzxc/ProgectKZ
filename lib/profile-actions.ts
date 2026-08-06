"use server";

import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { decryptSecret } from "@/lib/crypto";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await serviceClient.from("profiles").select("role").eq("user_id", userId);
  return (data || []).some(p => p.role === "admin");
}

async function getLinkedProfileIds(userId: string): Promise<number[]> {
  const { data } = await serviceClient.from("profile_links").select("profile_id").eq("user_id", userId);
  return (data || []).map(l => l.profile_id as number);
}

export async function getProfileData() {
  const userId = await getCurrentUserId();
  if (!userId) return { profiles: [], allProfiles: [], currentProfile: null };

  const [ownedRes, linksRes] = await Promise.all([
    serviceClient
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    serviceClient.from("profile_links").select("profile_id").eq("user_id", userId),
  ]);

  const owned = ownedRes.data || [];
  const linkedIds = (linksRes.data || []).map(l => l.profile_id as number);
  const ownedIds = new Set(owned.map(p => p.id));

  let linked: typeof owned = [];
  if (linkedIds.length > 0) {
    const { data } = await serviceClient
      .from("profiles")
      .select("*")
      .in("id", linkedIds)
      .order("created_at", { ascending: false });
    linked = (data || []).filter(p => !ownedIds.has(p.id));
  }

  // profiles — только «мои» (свои + подключённые): для переключателя профилей
  const profiles = [
    ...owned.map(p => ({ ...p, is_linked: false })),
    ...linked.map(p => ({ ...p, is_linked: true })),
  ];

  // allProfiles — для выбора исполнителей/брокеров: администратору видны все сотрудники
  let allProfiles = profiles;
  if (profiles.some(p => p.role === "admin")) {
    const { data } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    const currentIds = new Set(profiles.map(p => p.id));
    for (const p of (data || [])) {
      if (!currentIds.has(p.id)) allProfiles = [...allProfiles, { ...p, is_linked: false }];
    }
  }

  let currentProfile = null;
  if (profiles.length > 0) {
    const admin = profiles.find(p => p.role === "admin");
    currentProfile = admin || profiles.find(p => p.first_name || p.last_name || p.full_name) || profiles[0];
  }

  return { profiles, allProfiles, currentProfile };
}

export async function detachProfile(profileId: number): Promise<{ success?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Не авторизован" };

  const { error } = await serviceClient
    .from("profile_links")
    .delete()
    .eq("user_id", userId)
    .eq("profile_id", profileId);
  if (error) return { error: error.message };

  return { success: true };
}

export async function listProfilesForAttach() {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Не авторизован" };

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) return { error: "Доступ только для администратора" };

  const [profilesResult, linkedIds] = await Promise.all([
    serviceClient
      .from("profiles")
      .select("id, user_id, username, first_name, last_name, full_name, role, avatar_color, is_active")
      .order("created_at", { ascending: false }),
    getLinkedProfileIds(userId),
  ]);

  const linkedSet = new Set(linkedIds);

  return (profilesResult.data || []).filter(
    p => p.user_id !== userId && p.is_active !== false && !linkedSet.has(p.id)
  );
}

export async function attachProfile(profileId: number): Promise<{ success?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Не авторизован" };

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin) return { error: "Только администратор может добавлять профили" };

  const { data: target } = await serviceClient.from("profiles").select("id, user_id").eq("id", profileId).single();
  if (!target) return { error: "Профиль не найден" };
  if (target.user_id === userId) return { error: "Этот профиль уже добавлен" };

  const linkedIds = await getLinkedProfileIds(userId);
  if (linkedIds.includes(profileId)) return { error: "Этот профиль уже добавлен" };

  const { error } = await serviceClient.from("profile_links").insert({ user_id: userId, profile_id: profileId });
  if (error) return { error: error.message };

  return { success: true };
}

export async function attachProfileByCredentials(
  username: string,
  password: string
): Promise<{ success?: boolean; error?: string; profileId?: number }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Не авторизован" };

  const uname = (username || "").trim();
  const pwd = password || "";
  if (!uname || !pwd) return { error: "Введите логин и пароль" };

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id, user_id, password_enc")
    .eq("username", uname)
    .maybeSingle();

  if (!profile) return { error: "Профиль с таким логином не найден" };
  if (profile.user_id === userId) return { error: "Этот профиль уже добавлен" };

  const enc = profile.password_enc as string | null;
  if (!enc) return { error: "У этого профиля не сохранён пароль — обратитесь к администратору" };
  if (decryptSecret(enc) !== pwd) return { error: "Неверный пароль" };

  const linkedIds = await getLinkedProfileIds(userId);
  if (linkedIds.includes(profile.id)) return { error: "Этот профиль уже добавлен" };

  const { error } = await serviceClient.from("profile_links").insert({ user_id: userId, profile_id: profile.id });
  if (error) return { error: error.message };

  return { success: true, profileId: profile.id };
}
