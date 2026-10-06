export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6 text-center">
      <h1 className="display text-5xl text-gold">Offline</h1>
      <p className="text-muted">This page isn&apos;t saved on your device yet. Pages you&apos;ve opened before still work, and anything you log offline syncs when you reconnect.</p>
      <a href="/home" className="btn-gold">Try again</a>
    </main>
  );
}
