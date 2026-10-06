import Link from "next/link";
import { Bell } from "lucide-react";

export function Header({ unread, name, avatarUrl }: { unread: number; name: string; avatarUrl: string | null }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/90 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
      <Link href="/home" className="display text-2xl text-gold">IRONHEART</Link>
      <div className="flex items-center gap-2">
        <Link href="/notifications" aria-label={`Notifications, ${unread} unread`} className="relative grid size-11 place-items-center">
          <Bell className="size-6" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-gold px-1 font-mono text-xs font-bold text-bg">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link href="/profile" aria-label="Profile" className="grid size-11 place-items-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- provider avatar, any host
            <img src={avatarUrl} alt="" className="size-8 rounded-full border border-gold" />
          ) : (
            <span className="grid size-8 place-items-center rounded-full border border-gold font-bold text-gold">
              {name.slice(0, 1).toUpperCase() || "?"}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
