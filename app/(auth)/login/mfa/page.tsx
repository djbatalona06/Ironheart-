import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { MfaForm } from "./MfaForm";

export default async function Mfa() {
  const { user, mfaPending } = await currentUser();
  if (!user) redirect("/login");
  if (!mfaPending) redirect("/auth/continue");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <header className="space-y-2 text-center">
        <h1 className="display text-5xl text-gold">ONE MORE STEP</h1>
        <p className="text-muted">Enter the 6-digit code from your authenticator app.</p>
      </header>
      <MfaForm />
    </main>
  );
}
