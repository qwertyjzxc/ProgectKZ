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
