import { createClient } from "@/lib/supabase/server";
import { NextResponse, NextRequest } from "next/server";

// Используем NextRequest вместо стандартного Request
export async function GET(request: NextRequest) {
  // 1. Берем данные из уже готового nextUrl
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // 2. Обязательно обрабатываем ошибку
    if (error) {
      // Редирект обратно на страницу входа с передачей ошибки
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // 3. Защита редиректа для продакшен-среды (учитываем прокси)
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}/`);
  }

  // Дефолтный редирект для локальной разработки (localhost)
  return NextResponse.redirect(`${origin}/`);
}
