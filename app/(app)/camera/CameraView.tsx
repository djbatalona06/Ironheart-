"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { MAX_CLIP_SECONDS, useCamera } from "@/hooks/useCamera";
import { compressPhoto, saveMedia } from "@/lib/camera/save";

type W = { id: string; name: string; started_at: string };
type Shot = { blob: Blob; url: string; type: "photo" | "video"; seconds?: number };

export function CameraView({ userId, recent, checkin }: { userId: string; recent: W[]; checkin: W | null }) {
  const router = useRouter();
  const { videoRef, status, start, stop, snap, record, stopClip } = useCamera();
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [recording, setRecording] = useState(0);
  const [shot, setShot] = useState<Shot | null>(null);
  const [caption, setCaption] = useState("");
  const [target, setTarget] = useState(checkin?.id ?? recent[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!shot) void start(facing); return stop; }, [facing, shot, start, stop]);
  useEffect(() => {
    if (!recording) return;
    const t = setTimeout(() => setRecording((r) => (r ? r + 1 : 0)), 1000);
    return () => clearTimeout(t);
  }, [recording]);

  const setFile = (f: File | undefined) => f && setShot({ blob: f, url: URL.createObjectURL(f), type: f.type.startsWith("video") ? "video" : "photo" });

  async function shutter() {
    if (mode === "photo") {
      const blob = await snap();
      navigator.vibrate?.(10);
      return setShot({ blob, url: URL.createObjectURL(blob), type: "photo" });
    }
    if (recording) return stopClip();
    setRecording(1);
    try {
      const { blob, seconds } = await record();
      setShot({ blob, url: URL.createObjectURL(blob), type: "video", seconds });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Recording failed.");
    } finally {
      setRecording(0);
    }
  }

  async function save() {
    if (!shot) return;
    setBusy(true); setMsg(null);
    try {
      const blob = shot.type === "photo" ? await compressPhoto(shot.blob) : shot.blob;
      const isCheckin = Boolean(checkin) || (shot.type === "photo" && !!target);
      const { local } = await saveMedia({ blob, type: shot.type, userId, workoutId: target || null,
        caption: caption.trim() || null, isCheckin, seconds: shot.seconds });
      if (local && !navigator.onLine) {
        URL.revokeObjectURL(shot.url);
        setShot(null); setBusy(false); setCaption("");
        return setMsg("Saved on this device. It uploads automatically when you're back online.");
      }
      router.push(target ? `/workouts/${target}` : "/profile");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save.");
      setBusy(false);
    }
  }

  if (shot) return (
    <div className="space-y-3">
      <h1 className="display text-3xl">{checkin ? "Check-in" : "Preview"}</h1>
      {shot.type === "photo"
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL
        ? <img src={shot.url} alt="Captured photo" className="w-full rounded-lg" />
        : <video src={shot.url} playsInline muted controls className="w-full rounded-lg" />}
      {shot.type === "video" && (
        <input className="field" placeholder="Caption (e.g. squat depth check)" aria-label="Caption" maxLength={300}
          value={caption} onChange={(e) => setCaption(e.target.value)} />
      )}
      {!checkin && (
        <label className="block space-y-1"><span className="text-sm text-muted">Attach to</span>
          <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
            {recent.map((w) => <option key={w.id} value={w.id}>{w.name} · {new Date(w.started_at).toLocaleDateString()}</option>)}
            <option value="">No workout (profile)</option>
          </select>
        </label>
      )}
      {shot.type === "photo" && target && <p className="text-xs text-gold">This photo marks that day as verified on your pact calendar.</p>}
      {msg && <p role="status" className="text-sm text-gold">{msg}</p>}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" disabled={busy} onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); }}>Retake</button>
        <button className="btn-gold flex-1" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );

  return (
    <div className="-mx-4 -mt-2 flex h-[calc(100dvh-10rem)] flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay aria-label="Camera preview"
          className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
        {status !== "live" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            {status === "starting" || status === "idle" ? <p className="text-muted">Starting camera…</p> : (
              <div className="space-y-3">
                <p className="font-bold">{status === "denied" ? "Camera access is blocked" : "Camera isn't available"}</p>
                <p className="text-sm text-muted">
                  {status === "denied"
                    ? "Allow camera access in Settings → Safari → Camera (or your browser's site settings), then reopen IRONHEART."
                    : "Your device or browser didn't start the camera."}
                </p>
                <label className="btn-gold cursor-pointer">Upload instead
                  <input type="file" accept="image/*,video/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0])} />
                </label>
              </div>
            )}
          </div>
        )}
        {checkin && <p className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-gold">Check-in · {checkin.name}</p>}
        <button aria-label="Switch camera" onClick={() => setFacing(facing === "user" ? "environment" : "user")}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/60 text-gold"><RefreshCw className="size-5" /></button>
        {recording > 0 && <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-danger px-3 py-1 font-mono text-sm">● {Math.min(recording - 1, MAX_CLIP_SECONDS)}s / {MAX_CLIP_SECONDS}s</p>}
      </div>
      <div className="space-y-4 bg-black p-4">
        <div className="flex justify-center gap-2" role="tablist">
          {(["photo", "video"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} disabled={recording > 0} onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${mode === m ? "bg-gold text-bg" : "text-muted"}`}>{m}</button>
          ))}
        </div>
        <div className="flex justify-center">
          <button aria-label={mode === "photo" ? "Take photo" : recording ? "Stop recording" : "Start recording"} onClick={shutter}
            disabled={status !== "live"}
            className="grid size-18 place-items-center rounded-full border-4 border-gold disabled:opacity-40">
            <span className={`block bg-gold transition-all ${recording ? "size-7 rounded-md bg-danger" : mode === "video" ? "size-14 rounded-full bg-danger" : "size-14 rounded-full"}`} />
          </button>
        </div>
        {msg && <p role="status" className="text-center text-sm text-gold">{msg}</p>}
      </div>
    </div>
  );
}
