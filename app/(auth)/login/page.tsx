import { LoginForm } from "./LoginForm";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <header className="space-y-2 text-center">
        <h1 className="display text-6xl text-gold">IRONHEART</h1>
        <p className="text-muted">Hit your week or owe the stake.</p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">
          That link didn&apos;t work or expired. Try again, or use Google or GitHub.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
