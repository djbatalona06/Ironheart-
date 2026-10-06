import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "./types";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client. Server only; bypasses RLS — use for counters/admin tasks. */
export function supabaseAdmin() {
  return createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
  });
}

/** Signed-in user or redirect to /login. Uses getUser() (verified), not getSession(). */
export async function requireUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

/** The user's IANA timezone from the `tz` cookie (UTC until the browser reports it). */
export async function userTz() {
  const { validTz } = await import("@/lib/tz");
  return validTz((await cookies()).get("tz")?.value);
}
