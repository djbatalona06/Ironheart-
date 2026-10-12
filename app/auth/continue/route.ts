import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE, safeNext } from "@/lib/auth/next";
import { currentUser } from "@/lib/supabase/server";

// Where a freshly signed-in browser goes: 2FA prompt → onboarding → the page they wanted → Home.
export async function GET(request: NextRequest) {
  const { supabase, user, mfaPending } = await currentUser();
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!user) return to("/login");
  if (mfaPending) return to("/login/mfa");
  const { data } = await supabase.from("profiles").select("onboarded").single();
  if (!data?.onboarded) return to("/onboarding");
  const res = to(safeNext(request.cookies.get(NEXT_COOKIE)?.value) ?? "/home");
  res.cookies.delete(NEXT_COOKIE);
  return res;
}
