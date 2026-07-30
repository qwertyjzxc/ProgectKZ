"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMyProfiles() {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return profiles;
}
