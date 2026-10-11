import { aiConfig } from "@/lib/ai/provider";
import { requireUser, userTz } from "@/lib/supabase/server";
import { today } from "@/lib/tz";
import { FoodLogger } from "./FoodLogger";

export default async function Foods({ searchParams }: PageProps<"/nutrition/foods">) {
  const { meal, d } = await searchParams;
  const { user } = await requireUser();
  const tz = await userTz();
  const now = today(tz);
  return (
    <FoodLogger userId={user.id} day={typeof d === "string" && d <= now ? d : now} isToday={!d || d === now}
      meal={["breakfast", "lunch", "dinner", "snack"].includes(String(meal)) ? String(meal) : "snack"}
      aiEnabled={aiConfig() !== null} />
  );
}
