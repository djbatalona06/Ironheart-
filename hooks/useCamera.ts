"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CamStatus = "idle" | "starting" | "live" | "denied" | "unavailable";
export const MAX_CLIP_SECONDS = 15;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Camera stream + photo/clip capture with the iOS PWA workarounds from docs/06. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const [status, setStatus] = useState<CamStatus>("idle");

  const stop = useCallback(() => {
    // Full teardown: iOS fails later recordings if any track is left alive.
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async (facing: "user" | "environment") => {
    stop();
    if (!navigator.mediaDevices?.getUserMedia) return setStatus("unavailable");
    setStatus("starting");
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
        });
        // iOS sometimes hands back an already-ended track: retry instead of showing black.
        if (s.getVideoTracks()[0]?.readyState !== "live") { s.getTracks().forEach((t) => t.stop()); throw new Error("ended"); }
        stream.current = s;
        const v = videoRef.current!;
        v.srcObject = s;
        await v.play().catch(() => {});
        return setStatus("live");
      } catch (e) {
        if (e instanceof DOMException && e.name === "NotAllowedError") return setStatus("denied");
        await sleep(500);
      }
    }
    setStatus("unavailable");
  }, [stop]);

  useEffect(() => stop, [stop]);

  const snap = useCallback(async (): Promise<Blob> => {
    const v = videoRef.current!;
    const c = Object.assign(document.createElement("canvas"), { width: v.videoWidth, height: v.videoHeight });
    c.getContext("2d")!.drawImage(v, 0, 0);
    return new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("capture failed"))), "image/jpeg", 0.9));
  }, []);

  /** Records until `stopClip()` or 15s, whichever comes first. */
  const record = useCallback(() => new Promise<{ blob: Blob; seconds: number }>((resolve, reject) => {
    if (!stream.current || typeof MediaRecorder === "undefined") return reject(new Error("Recording isn't supported here."));
    const mimeType = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
    const rec = new MediaRecorder(stream.current, { mimeType, videoBitsPerSecond: 1_500_000 });
    const chunks: Blob[] = [];
    const t0 = Date.now();
    const timer = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_CLIP_SECONDS * 1000);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      clearTimeout(timer);
      recorder.current = null;
      await sleep(300); // let iOS release the encoder before the next recording
      resolve({ blob: new Blob(chunks, { type: mimeType }), seconds: Math.min(MAX_CLIP_SECONDS, Math.round((Date.now() - t0) / 1000)) });
    };
    rec.onerror = () => reject(new Error("Recording failed."));
    recorder.current = rec;
    rec.start(1000);
  }), []);

  const stopClip = useCallback(() => { if (recorder.current?.state === "recording") recorder.current.stop(); }, []);

  return { videoRef, status, start, stop, snap, record, stopClip };
}
