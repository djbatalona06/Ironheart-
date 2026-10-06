import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/env";

const PUBLIC = ["/login", "/auth", "/api/health", "/setup", "/offline"];

// Refreshes the Supabase session cookie on every request and does an
// optimistic auth redirect. Real authorization is RLS + requireUser().
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured) {
    const isSetup = request.nextUrl.pathname === "/setup";
    return isSetup ? NextResponse.next() : NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));

  if (!data.user && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (data.user && path === "/login") return NextResponse.redirect(new URL("/home", request.url));
  return response;
}

export const config = {
  // Skip static assets, the service worker and icons.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
