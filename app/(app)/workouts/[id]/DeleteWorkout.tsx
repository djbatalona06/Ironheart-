"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function DeleteWorkout({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button className="btn-ghost text-danger" aria-label="Delete workout" onClick={async () => {
      if (!confirm("Delete this workout? It will no longer count toward your pact.")) return;
      const { error } = await supabaseBrowser().from("workouts").delete().eq("id", id);
      if (error) return alert(error.message);
      router.push("/workouts");
      router.refresh();
    }}><Trash2 className="size-4" /></button>
  );
}
