import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase } = await requireUser();
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("onboarded, name, avatar_url, nutrition_enabled").single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);
  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Header unread={count ?? 0} name={profile.name ?? ""} avatarUrl={profile.avatar_url} />
      <main className="flex-1 px-4 pb-28 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
