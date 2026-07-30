"use server";

import { serviceClient } from "@/lib/supabase/service";

export async function getMyProfiles() {
  const { data: profiles, error } = await serviceClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return profiles;
}

export async function getCurrentProfile() {
  const { data: profiles, error } = await serviceClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !profiles || profiles.length === 0) return null;

  const admin = profiles.find(p => p.role === "admin");
  if (admin) return admin;

  const named = profiles.find(p => p.full_name);
  if (named) return named;

  return profiles[0];
}
