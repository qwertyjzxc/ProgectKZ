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
  // x-forwarded-host приходит из запроса — доверять ему нельзя (open redirect):
  // учитываем, только если он совпадает с хостом из NEXT_PUBLIC_SITE_URL.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (forwardedHost && siteUrl) {
    try {
      if (new URL(siteUrl).host === forwardedHost) {
        return NextResponse.redirect(`${siteUrl}/`);
      }
    } catch {
      // NEXT_PUBLIC_SITE_URL битый — просто дефолт ниже
    }
  }

  // Дефолтный редирект для локальной разработки (localhost)
  return NextResponse.redirect(`${origin}/`);
}
