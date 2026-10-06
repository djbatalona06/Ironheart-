import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Handles OAuth/PKCE (?code=) and email links using token_hash (?token_hash=&type=).
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

  if (error) return NextResponse.redirect(new URL("/login?error=1", request.url));

  const { data } = await supabase.from("profiles").select("onboarded").single();
  return NextResponse.redirect(new URL(data?.onboarded ? "/home" : "/onboarding", request.url));
}
