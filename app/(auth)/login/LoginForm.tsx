"use client";

import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const redirectTo = () => `${location.origin}/auth/callback`;

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase/client");
      const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: "email" });
      if (error) return setError("That code didn't work. Check it, or request a new one.");
      location.replace("/auth/continue");
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error ?? "Couldn't send the sign-in link. Try again.");
      setSent(true);
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function oauth(provider: "google" | "github") {
    setError(null);
    setPending(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase/client");
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo() },
      });
      if (error) setError(error.message);
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {sent ? (
        <div className="card space-y-3 p-4 text-center">
          <p className="font-semibold">Check your email</p>
          <p className="text-sm text-muted">We sent a 6-digit code and a sign-in link to {email}.</p>
          <form onSubmit={verifyCode} className="space-y-3">
            <label className="block space-y-1 text-left">
              <span className="text-sm text-muted">Sign-in code</span>
              <input
                className="field text-center font-mono text-2xl tracking-[0.4em]"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button className="btn-gold w-full" type="submit" disabled={pending || code.length !== 6}>
              {pending ? "Checking…" : "Sign in"}
            </button>
          </form>
          <button className="btn-ghost w-full" disabled={pending} onClick={() => { setCode(""); sendLink(); }}>
            {pending ? "Sending…" : "Send a new code"}
          </button>
          <p className="text-xs text-muted">You can request up to 5 codes every 10 minutes. Nothing arriving? Check spam, or use Google or GitHub below.</p>
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
          <button className="btn-gold w-full" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Email me a sign-in code"}
          </button>
        </form>
      )}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
      </div>
      <button className="btn-ghost w-full" disabled={pending} onClick={() => oauth("google")}>Continue with Google</button>
      <button className="btn-ghost w-full" disabled={pending} onClick={() => oauth("github")}>Continue with GitHub</button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
