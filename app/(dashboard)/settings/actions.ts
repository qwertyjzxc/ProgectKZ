"use server";

import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { encryptSecret } from "@/lib/crypto";

async function getLinkedProfileIds(userId: string): Promise<number[]> {
  const { data } = await serviceClient.from("profile_links").select("profile_id").eq("user_id", userId);
  return (data || []).map(l => l.profile_id as number);
}

export async function updateMyProfile(data: {
  profileId: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  username?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: target } = await serviceClient
    .from("profiles")
    .select("id, user_id, role, username, email")
    .eq("id", data.profileId)
    .single();
  if (!target) return { error: "Профиль не найден" };

  const ownerId = (target.user_id as string) || "";
  let hasAccess = !!ownerId && ownerId === user.id;
  if (!hasAccess) {
    const linkedIds = await getLinkedProfileIds(user.id);
    hasAccess = linkedIds.includes(data.profileId);
  }
  if (!hasAccess) return { error: "Нет доступа к этому профилю" };
  const full_name = (data.first_name + " " + data.last_name).trim();
  const updateFields: { first_name: string; last_name: string; full_name: string; phone: string; email?: string; username?: string } = {
    first_name: data.first_name,
    last_name: data.last_name,
    full_name,
    phone: data.phone,
  };

  if (data.username && target.role === "admin" && data.username.trim() !== (target.username || "")) {
    updateFields.username = data.username.trim();
  }

  const emailChanged = !!data.email && data.email !== (target.email || "");
  if (emailChanged) updateFields.email = data.email;

  const { error: profileError } = await serviceClient
    .from("profiles")
    .update(updateFields)
    .eq("id", target.id);

  if (profileError) return { error: profileError.message };

  if (updateFields.username && ownerId) {
    const { data: authUser } = await serviceClient.auth.admin.getUserById(ownerId);
    const meta = (authUser?.user?.user_metadata || {}) as Record<string, unknown>;
    await serviceClient.auth.admin.updateUserById(ownerId, {
      user_metadata: { ...meta, username: updateFields.username },
    });
  }

  if (emailChanged && ownerId) {
    const { error: authError } = await serviceClient.auth.admin.updateUserById(ownerId, {
      email: data.email,
    });
    if (authError) {
      await serviceClient
        .from("profiles")
        .update({ email: target.email || "" })
        .eq("id", target.id);
      return { error: authError.message };
    }
  }

  return { success: true };
}

export async function changeMyPassword(password: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };
  if (!password || password.length < 6) return { error: "Пароль должен быть не короче 6 символов" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  await serviceClient.from("profiles").update({ password_enc: encryptSecret(password) }).eq("user_id", user.id);
  return { success: true };
}
