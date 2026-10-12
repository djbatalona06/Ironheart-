import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Handles OAuth/PKCE (?code=) and email links using token_hash (?token_hash=&type=).
// Takes no redirect target: /auth/continue decides, from a validated cookie.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const supabase = await supabaseServer();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (error) {
    // A signed-in user back from Google/GitHub without a code failed to connect it (e.g. already used).
    const linking = !tokenHash && url.searchParams.has("error") && (await supabase.auth.getUser()).data.user;
    return NextResponse.redirect(new URL(linking ? "/profile?error=link" : "/login?error=1", request.url));
  }
  return NextResponse.redirect(new URL("/auth/continue", request.url));
}
