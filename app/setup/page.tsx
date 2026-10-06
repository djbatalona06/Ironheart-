import { supabaseConfigured } from "@/lib/env";
import { redirect } from "next/navigation";

export default function Setup() {
  if (supabaseConfigured) redirect("/home");
  return (
    <main className="mx-auto max-w-md p-6 pt-16 space-y-4">
      <h1 className="display text-4xl text-gold">Setup needed</h1>
      <p className="text-muted">
        IRONHEART isn&apos;t connected to a database yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to the environment, then redeploy.
      </p>
      <p className="text-muted">Step-by-step: <code>SETUP.md</code> in the repository.</p>
    </main>
  );
}
