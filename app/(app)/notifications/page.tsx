import Link from "next/link";
import { revalidatePath } from "next/cache";
import { describe } from "@/lib/notifications/format";
import { requireUser } from "@/lib/supabase/server";

async function markAllRead() {
  "use server";
  const { supabase } = await requireUser();
  await supabase.rpc("mark_all_read");
  revalidatePath("/", "layout");
}

export default async function Notifications() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  const unread = data?.some((n) => !n.read);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Notifications</h1>
        {unread && <form action={markAllRead}><button className="text-sm text-gold underline">Mark all read</button></form>}
      </div>
      {error && <p role="alert" className="text-danger">Couldn&apos;t load notifications.</p>}
      {data?.length === 0 && <p className="card p-6 text-center text-muted">Nothing yet. Start a pact or a challenge.</p>}
      <ul className="space-y-2">
        {data?.map((n) => {
          const d = describe(n.type, n.payload, user.id);
          return (
            <li key={n.id}>
              <Link href={d.href} className={`card flex min-h-14 items-center gap-3 p-3 ${n.read ? "" : "border-gold"}`}>
                {!n.read && <span aria-label="unread" className="size-2 shrink-0 rounded-full bg-gold" />}
                <span className="flex-1 text-sm">{d.text}</span>
                <time className="shrink-0 text-xs text-muted" dateTime={n.created_at}>
                  {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </time>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
