"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Bottom sheet on native <dialog> (focus trap, Esc and backdrop close for free). */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}
      className="mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-lg rounded-t-2xl border border-line bg-surface p-0 text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm">
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface p-4">
        <h2 className="display text-2xl">{title}</h2>
        <button aria-label="Close" onClick={onClose} className="grid size-11 place-items-center"><X /></button>
      </div>
      <div className="p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">{open && children}</div>
    </dialog>
  );
}
