"use server";

import { createClient } from '@/lib/supabase/server';
import { serviceClient } from '@/lib/supabase/service';

export async function login({ username, password }: { username: string; password: string }) {
  try {
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return { error: 'User not found' };
    }

    if (!profile.email) {
      return { error: 'No email in profile' };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error || !data.session) {
      return { error: error?.message || 'Login failed' };
    }

    return { success: true };
  } catch (err) {
    console.error('LOGIN EXCEPTION:', err);
    return { error: 'Internal server error' };
  }
}
