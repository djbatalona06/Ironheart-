import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default async function Onboarding() {
  const { supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("name, onboarded").single();
  if (profile?.onboarded) redirect("/home");
  return (
    <main className="mx-auto max-w-md p-6 pt-12">
      <OnboardingForm defaultName={profile?.name ?? ""} />
    </main>
  );
}
