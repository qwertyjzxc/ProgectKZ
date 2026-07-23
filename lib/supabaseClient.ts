import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey: string | undefined =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Отсутствует переменная окружения NEXT_PUBLIC_SUPABASE_URL. " +
      "Добавьте её в .env.local"
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "Отсутствует переменная окружения NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Добавьте её в .env.local"
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);