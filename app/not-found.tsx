import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6 text-center">
      <h1 className="display text-6xl text-gold">404</h1>
      <p className="text-muted">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/home" className="btn-gold">Back to IRONHEART</Link>
    </main>
  );
}
