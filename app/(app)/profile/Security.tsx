"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Factor, UserIdentity } from "@supabase/supabase-js";
import { clearCachedPages } from "@/components/pwa/Pwa";
import { NEXT_COOKIE } from "@/lib/auth/next";
import { supabaseBrowser } from "@/lib/supabase/client";
import { signOut } from "./actions";

const PROVIDERS = [{ id: "google", label: "Google" }, { id: "github", label: "GitHub" }] as const;

export function Security({ factors, identities, linkError }: { factors: Factor[]; identities: UserIdentity[]; linkError: boolean }) {
  const router = useRouter();
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [name, setName] = useState("Phone");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? "Couldn't connect that account. It may already belong to another IRONHEART user." : null);
  const verified = factors.filter((f) => f.status === "verified");
  const mfa = () => supabaseBrowser().auth.mfa;

  async function run(task: () => Promise<{ error: { message: string } | null } | void>) {
    setError(null);
    setPending(true);
    try {
      const r = await task();
      if (r?.error) setError(r.error.message);
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const startEnroll = () => run(async () => {
    // Clear half-finished setups so a retry doesn't collide with them.
    for (const f of (await mfa().listFactors()).data?.all ?? []) {
      if (f.status === "unverified") await mfa().unenroll({ factorId: f.id });
    }
    const { data, error } = await mfa().enroll({ factorType: "totp", friendlyName: name.trim() || "Phone", issuer: "IRONHEART" });
    if (error) return { error };
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    return { error: null };
  });

  const finishEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const { error } = await mfa().challengeAndVerify({ factorId: enrolling!.id, code });
      if (error) return { error: { message: "That code didn't work. Enter the current code from the app." } };
      setEnrolling(null);
      setCode("");
      router.refresh();
      return { error: null };
    });
  };

  const remove = (f: Factor) => {
    const last = verified.length === 1;
    if (!confirm(last ? "Turn off two-step verification? Your account will only need your email or Google/GitHub to sign in." : `Remove "${f.friendly_name}"?`)) return;
    return run(async () => {
      const r = await mfa().unenroll({ factorId: f.id });
      if (!r.error) router.refresh();
      return r;
    });
  };

  const connect = (provider: "google" | "github") => run(async () => {
    document.cookie = `${NEXT_COOKIE}=/profile; path=/; max-age=900; samesite=lax`;
    return supabaseBrowser().auth.linkIdentity({ provider, options: { redirectTo: `${location.origin}/auth/callback` } });
  });

  const disconnect = (identity: UserIdentity) => {
    if (!confirm(`Disconnect ${identity.provider}? You won't be able to sign in with it anymore.`)) return;
    return run(async () => {
      const r = await supabaseBrowser().auth.unlinkIdentity(identity);
      if (!r.error) router.refresh();
      return r;
    });
  };

  return (
    <section className="card space-y-4 p-4" aria-labelledby="security-h">
      <h2 id="security-h" className="display text-2xl">Security</h2>

      <div className="space-y-2">
        <h3 className="font-bold">Two-step verification</h3>
        <p className="text-sm text-muted">
          {verified.length ? "On. Signing in also needs a code from your authenticator app." : "Add a code from an authenticator app (like your phone's password manager) on top of your email."}
        </p>
        <ul className="space-y-1">
          {verified.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{f.friendly_name || "Authenticator"}</span>
              <button className="text-danger underline" disabled={pending} onClick={() => remove(f)}>Remove</button>
            </li>
          ))}
        </ul>
        {enrolling ? (
          <form onSubmit={finishEnroll} className="space-y-3">
            <p className="text-sm">Scan this with your authenticator app, then enter the code it shows.</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG from Supabase */}
            <img src={enrolling.qr} alt="QR code for your authenticator app" className="mx-auto size-48 rounded-lg bg-white p-2" />
            <p className="break-all text-center font-mono text-xs text-muted">Can&apos;t scan? Enter this key: {enrolling.secret}</p>
            <label className="block space-y-1">
              <span className="text-sm text-muted">Code from the app</span>
              <input className="field text-center font-mono text-xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => { setEnrolling(null); setCode(""); }}>Cancel</button>
              <button className="btn-gold flex-1" disabled={pending || code.length !== 6}>{pending ? "Checking…" : "Turn on"}</button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Authenticator name</span>
              <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="btn-ghost" disabled={pending} onClick={startEnroll}>{verified.length ? "Add backup" : "Set up"}</button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">Sign-in methods</h3>
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between gap-2"><span>Email code</span><span className="text-muted">Always on</span></li>
          {PROVIDERS.map(({ id, label }) => {
            const identity = identities.find((i) => i.provider === id);
            return (
              <li key={id} className="flex items-center justify-between gap-2">
                <span>{label}{identity?.identity_data?.email ? <span className="text-muted"> · {String(identity.identity_data.email)}</span> : null}</span>
                {identity ? (
                  identities.length > 1 && <button className="underline" disabled={pending} onClick={() => disconnect(identity)}>Disconnect</button>
                ) : (
                  <button className="underline" disabled={pending} onClick={() => connect(id)}>Connect</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <form action={signOut.bind(null, "global")} onSubmit={clearCachedPages}>
        <button className="btn-ghost w-full">Sign out of all devices</button>
      </form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
