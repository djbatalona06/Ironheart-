import { aiConfig } from "@/lib/ai/provider";
import { Bot } from "./Bot";

export default function BotPage() {
  return (
    <div className="space-y-4">
      <h1 className="display text-4xl">Training bot</h1>
      <p className="text-sm text-muted">Ask about your logged training, deloads, or get a program formatted for export. 10 questions a day.</p>
      <Bot enabled={aiConfig() !== null} />
    </div>
  );
}
