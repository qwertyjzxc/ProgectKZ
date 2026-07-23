import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Принудительно загружаем .env или .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("❌ Ошибка: Не найден SUPABASE_URL в файле .env / .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  console.log("Проверяем подключение к Supabase...");

  const { data, error } = await supabase
    .from('connection_test')
    .select('*');

  if (error) {
    console.error("❌ Ошибка выполнения запроса:", error.message);
  } else {
    console.log("✅ Успешное подключение! Данные из Supabase:");
    console.log(data);
  }
}

checkConnection();