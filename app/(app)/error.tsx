"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card space-y-3 p-6 text-center">
      <h1 className="display text-3xl text-danger">Something broke</h1>
      <p className="text-muted">{typeof navigator !== "undefined" && !navigator.onLine
        ? "You're offline. Anything you logged is saved on this device and will sync."
        : "That didn't load. Try again in a moment."}</p>
      <button className="btn-gold" onClick={reset}>Try again</button>
    </div>
  );
}
