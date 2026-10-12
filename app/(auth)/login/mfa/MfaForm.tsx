"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function MfaForm() {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const mfa = supabaseBrowser().auth.mfa;
      const { data, error } = await mfa.listFactors();
      if (error) throw error;
      // A code from any of the user's authenticators is accepted.
      for (const f of data.totp) {
        if (!(await mfa.challengeAndVerify({ factorId: f.id, code })).error) return location.replace("/auth/continue");
      }
      setError("That code didn't work. Codes change every 30 seconds — try the current one.");
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function switchAccount() {
    await supabaseBrowser().auth.signOut({ scope: "local" });
    location.replace("/login");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={verify} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">Authenticator code</span>
          <input
            className="field text-center font-mono text-2xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <button className="btn-gold w-full" type="submit" disabled={pending || code.length !== 6}>
          {pending ? "Checking…" : "Verify"}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className="btn-ghost w-full" onClick={switchAccount}>Use a different account</button>
      <p className="text-center text-xs text-muted">Lost your phone? Use a backup authenticator if you added one in Profile → Security.</p>
    </div>
  );
}
