import OpenAI from "openai";
import { z } from "zod";
import { trainingContext } from "@/lib/ai/context";
import { FOOD_SYSTEM, FoodEstimate, MODEL, SYSTEM } from "@/lib/ai/prompts";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 60;

const Body = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("chat"),
    message: z.string().trim().min(1).max(2000),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(10).default([]),
  }),
  z.object({ mode: z.literal("food_estimate"), message: z.string().trim().min(2).max(300) }),
]);

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return fail(503, "AI isn't set up on this server yet.");
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "Sign in first.");
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "Invalid request.");
  const body = parsed.data;

  const admin = supabaseAdmin();
  const { data: refused, error } = await admin.rpc("ai_take", { uid: user.id, food: body.mode === "food_estimate" });
  if (error) return fail(500, "Couldn't check your AI quota.");
  if (refused) return fail(429, refused);

  const openai = new OpenAI();
  try {
    if (body.mode === "food_estimate") {
      const res = await openai.responses.create({
        model: MODEL, instructions: FOOD_SYSTEM, input: body.message,
        text: { format: { type: "json_schema", name: "food_estimate", strict: true, schema: z.toJSONSchema(FoodEstimate, { target: "draft-7" }) } },
      });
      await admin.rpc("ai_record", { uid: user.id, used: res.usage?.total_tokens ?? 0 });
      const out = FoodEstimate.safeParse(JSON.parse(res.output_text));
      return out.success ? Response.json(out.data) : fail(502, "Couldn't read the estimate. Enter it manually.");
    }

    const context = await trainingContext(sb, user.id);
    const stream = await openai.responses.create({
      model: MODEL, stream: true,
      instructions: `${SYSTEM}\n\nThe user's logged workouts (last 30 days):\n${context}`,
      input: [...body.history, { role: "user", content: body.message }],
    });
    const enc = new TextEncoder();
    return new Response(new ReadableStream({
      async start(controller) {
        try {
          for await (const ev of stream) {
            if (ev.type === "response.output_text.delta") controller.enqueue(enc.encode(ev.delta));
            if (ev.type === "response.completed") await admin.rpc("ai_record", { uid: user.id, used: ev.response.usage?.total_tokens ?? 0 });
          }
        } catch {
          controller.enqueue(enc.encode("\n\n[The reply was cut off. Try again.]"));
        }
        controller.close();
      },
    }), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch (e) {
    console.error("ai error", e instanceof Error ? e.message : e);
    return fail(502, "The AI service didn't respond. Try again in a minute.");
  }
}
