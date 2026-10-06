import { requireUser } from "@/lib/supabase/server";
import { DangerZone, LocalMediaPanel, ProfileForm } from "./ProfileForm";

export default async function Profile() {
  const { supabase, user } = await requireUser();
  const [{ data: p }, { data: gifts }, { data: media }] = await Promise.all([
    supabase.from("profiles").select("*").single(),
    supabase.from("user_gifts").select("id, message, created_at, gifts(name, icon)").eq("to_user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("media").select("id, storage_path, type, caption").eq("user_id", user.id).is("workout_id", null).order("created_at", { ascending: false }).limit(12),
  ]);
  if (!p) return null;
  const remote = (media ?? []).filter((m) => !m.storage_path.startsWith("local:")).map((m) => m.storage_path);
  const { data: signed } = remote.length ? await supabase.storage.from("media").createSignedUrls(remote, 3600) : { data: [] };
  const withUrls = (media ?? []).map((m) => ({ ...m, url: signed?.find((x) => x.path === m.storage_path)?.signedUrl ?? null }));
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-full border-2 border-gold text-2xl font-bold text-gold">{(p.name ?? "?").slice(0, 1).toUpperCase()}</span>
        <div>
          <h1 className="display text-3xl">{p.name}</h1>
          <p className="text-sm text-muted">@{p.handle} · <span className="font-mono text-gold">{p.points} pts</span></p>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="display text-2xl">Gifts</h2>
        {gifts?.length ? (
          <ul className="flex flex-wrap gap-2">
            {gifts.map((g) => <li key={g.id} title={g.message ?? ""} className="rounded-full border border-gold px-3 py-1 text-sm text-gold">{g.gifts?.name}</li>)}
          </ul>
        ) : <p className="text-sm text-muted">No gifts yet. Win a challenge.</p>}
      </section>

      <ProfileForm p={p} />
      <LocalMediaPanel profileMedia={withUrls} />

      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-bold">Install on iPhone</h2>
        <p className="text-muted">Open IRONHEART in Safari → tap Share → Add to Home Screen. Allow camera access in Safari first so check-ins work from the home-screen app.</p>
      </section>
      <DangerZone email={user.email ?? ""} />
    </div>
  );
}
