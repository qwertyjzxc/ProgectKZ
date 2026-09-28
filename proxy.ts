import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser (а не getSession): валидирует токен на сервере и при необходимости
  // молча обновляет пару access/refresh, записывая свежие куки через setAll.
  // getSession только читает куки и протухшую/битую сессию не чинит —
  // отсюда периодические вылеты на /login при живом пользователе.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Публичные маршруты (без авторизации)
  const publicRoutes = ["/login", "/signup"];
  const callbackRoutes = ["/auth"];
  const publicPrefixes = ["/p/"];
  const isPublic =
    publicRoutes.includes(pathname) ||
    callbackRoutes.some((r) => pathname.startsWith(r)) ||
    publicPrefixes.some((r) => pathname.startsWith(r));

  // 1. Гость → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Авторизованный на /login или /signup → /overview
  if (user && publicRoutes.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  // 3. Авторизованный на корне → /overview
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};