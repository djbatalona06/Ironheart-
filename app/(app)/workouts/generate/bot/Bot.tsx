"use client";

import { useState } from "react";
import { FileText, Send } from "lucide-react";
import { exportTextDocx } from "@/lib/export/program";

type Msg = { role: "user" | "assistant"; content: string };
const SUGGEST = ["What's my bench progress?", "Do I need a deload?", "Format a 4-day upper/lower as a table"];

export function Bot({ enabled }: { enabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null); setBusy(true); setInput("");
    const history = msgs.slice(-10);
    setMsgs([...msgs, { role: "user", content: text }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "chat", message: text, history }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? "Something went wrong.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (let r = await reader.read(); !r.done; r = await reader.read()) {
        const chunk = dec.decode(r.value, { stream: true });
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: m.at(-1)!.content + chunk }]);
      }
    } catch (e) {
      setMsgs((m) => m.slice(0, -1));
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return <p className="card p-4 text-muted">The bot isn&apos;t set up on this server yet (missing OpenAI key).</p>;

  return (
    <div className="space-y-3">
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGEST.map((s) => <button key={s} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-gold" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      <ol className="space-y-3" aria-live="polite">
        {msgs.map((m, i) => (
          <li key={i} className={m.role === "user" ? "ml-10 rounded-lg bg-surface-2 p-3" : "card space-y-2 p-3"}>
            <p className="whitespace-pre-wrap text-sm">{m.content || "…"}</p>
            {m.role === "assistant" && m.content && !busy && (
              <button className="flex items-center gap-1 text-xs text-gold" onClick={() => exportTextDocx("IRONHEART bot", m.content)}>
                <FileText className="size-3" />Export .docx
              </button>
            )}
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <form className="sticky bottom-20 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <input className="field" placeholder="Ask about your training" aria-label="Message" maxLength={2000}
          value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
        <button className="btn-gold px-4" aria-label="Send" disabled={busy || !input.trim()}><Send className="size-4" /></button>
      </form>
    </div>
  );
}
