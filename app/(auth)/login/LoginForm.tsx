"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const COOLDOWN = 60;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = () => `${location.origin}/auth/callback`;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) return setError(error.message);
    setSent(true);
    setWait(COOLDOWN);
  }

  async function oauth(provider: "google" | "github") {
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo() },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-4">
      {sent ? (
        <div className="card space-y-3 p-4 text-center">
          <p className="font-semibold">Check your email</p>
          <p className="text-sm text-muted">We sent a sign-in link to {email}.</p>
          <button className="btn-ghost w-full" disabled={wait > 0} onClick={() => sendLink()}>
            {wait > 0 ? `Resend in ${wait}s` : "Resend link"}
          </button>
          <p className="text-xs text-muted">Nothing arriving? Use Google or GitHub below.</p>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm text-muted">Email</span>
            <input
              className="field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="btn-gold w-full" type="submit">Send magic link</button>
        </form>
      )}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
      </div>
      <button className="btn-ghost w-full" onClick={() => oauth("google")}>Continue with Google</button>
      <button className="btn-ghost w-full" onClick={() => oauth("github")}>Continue with GitHub</button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
