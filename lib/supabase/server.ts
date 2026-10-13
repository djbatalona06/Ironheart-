import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
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

/**
 * Verified user (getUser(), not getSession()) plus whether they still owe a
 * second factor: they have a verified authenticator but this session is aal1.
 * cache(): one auth-server round trip per page render, not one per layout/page/component.
 */
export const currentUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.factors?.some((f) => f.status === "verified")) return { supabase, user, mfaPending: false };
  // getUser() just validated this session's token, so reading its aal claim is safe.
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
  const claims = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString() || "{}");
  return { supabase, user, mfaPending: claims.aal !== "aal2" };
});

/** Fully signed-in user, or redirect to /login (or /login/mfa when a code is owed). */
export async function requireUser() {
  const { supabase, user, mfaPending } = await currentUser();
  if (!user) redirect("/login");
  if (mfaPending) redirect("/login/mfa");
  return { supabase, user };
}

/** The user's IANA timezone from the `tz` cookie (UTC until the browser reports it). */
export async function userTz() {
  const { validTz } = await import("@/lib/tz");
  return validTz((await cookies()).get("tz")?.value);
}
