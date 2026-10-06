export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3">
      <div className="h-10 w-48 animate-pulse rounded bg-surface-2" />
      {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-surface" />)}
    </div>
  );
}
