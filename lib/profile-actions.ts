"use server";

import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getMyProfiles() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data: profiles } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return profiles || [];
}

export async function getCurrentProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data: profiles } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!profiles || profiles.length === 0) return null;

  const admin = profiles.find(p => p.role === "admin");
  if (admin) return admin;

  const named = profiles.find(p => p.full_name);
  if (named) return named;

  return profiles[0];
}
