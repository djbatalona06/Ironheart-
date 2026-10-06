import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "./types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function supabaseBrowser() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

type Channel = ReturnType<ReturnType<typeof supabaseBrowser>["channel"]>;
type Status = Parameters<Parameters<Channel["subscribe"]>[0] & {}>[0];

/**
 * Subscribe only after the cookie session is loaded and handed to Realtime.
 * Otherwise the socket joins as `anon` and RLS silently filters every change event.
 */
export function subscribeAuthed(channel: Channel, onStatus?: (s: Status) => void) {
  void supabaseBrowser().auth.getSession().then(({ data }) => {
    if (data.session) void supabaseBrowser().realtime.setAuth(data.session.access_token);
    channel.subscribe((s) => onStatus?.(s));
  });
  return channel;
}
