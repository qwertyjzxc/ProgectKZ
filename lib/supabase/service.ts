import { createClient } from "@supabase/supabase-js";

// Сервисный клиент с service_role — только для серверных операций (обход RLS)
// Использовать только в server actions и route handlers!
export const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);