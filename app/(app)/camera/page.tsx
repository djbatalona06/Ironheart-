import { requireUser } from "@/lib/supabase/server";
import { CameraView } from "./CameraView";

export default async function Camera({ searchParams }: PageProps<"/camera">) {
  const { checkin } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: recent } = await supabase.from("workouts").select("id, name, started_at")
    .eq("user_id", user.id).eq("status", "done").order("started_at", { ascending: false }).limit(5);
  const target = typeof checkin === "string" ? recent?.find((w) => w.id === checkin) ?? null : null;
  return <CameraView userId={user.id} recent={recent ?? []} checkin={target} />;
}
