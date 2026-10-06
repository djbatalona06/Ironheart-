import { supabaseAdmin } from "@/lib/supabase/server";

// Daily Vercel cron keepalive: a real query so Supabase doesn't pause after 7 idle days.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const { error } = await supabaseAdmin().from("profiles").select("id").limit(1);
  return Response.json({ ok: !error }, { status: error ? 500 : 200 });
}
