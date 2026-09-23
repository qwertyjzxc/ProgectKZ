"use server";

import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getProfileData() {
  const userId = await getCurrentUserId();
  if (!userId) return { profiles: [], allProfiles: [], currentProfile: null };

  const { data: owned } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const profiles = (owned || []).map(p => ({ ...p, is_linked: false }));

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
