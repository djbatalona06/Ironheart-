import { createHmac } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const Body = z.object({ email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()) });

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return Response.json({ error: "Email sign-in isn't configured on this server." }, { status: 503 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email address." }, { status: 400 });

  const emailHash = createHmac("sha256", serviceRoleKey).update(parsed.data.email).digest("hex");
  const { data: retryAfter, error: limitError } = await supabaseAdmin().rpc("take_magic_link_slot", {
    p_email_hash: emailHash,
  });
  if (limitError || retryAfter == null) {
    console.error("magic link rate limit error", limitError?.message ?? "Missing limiter result");
    return Response.json({ error: "Couldn't check the sign-in limit. Try again shortly." }, { status: 500 });
  }
  if (retryAfter > 0) {
    return Response.json(
      { error: `Too many sign-in links requested. Try again in ${Math.ceil(retryAfter / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: new URL("/auth/callback", request.url).toString() },
  });
  if (error) {
    console.error("magic link send error", error.message);
    return Response.json({ error: "Couldn't send the sign-in link. Check your email and try again." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
