"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, Camera, Dumbbell, Home, Swords } from "lucide-react";

const TABS = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/workouts", label: "Workouts", Icon: Dumbbell },
  { href: "/camera", label: "Camera", Icon: Camera, center: true },
  { href: "/nutrition", label: "Nutrition", Icon: Apple },
  { href: "/wagers", label: "Wagers", Icon: Swords },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ href, label, Icon, center }) => {
          const active = path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs ${active ? "text-gold" : "text-muted"}`}>
                {center ? (
                  <span className="-mt-6 grid size-14 place-items-center rounded-full bg-gold text-bg shadow-[0_0_24px_rgba(212,175,55,0.35)]">
                    <Icon className="size-7" />
                  </span>
                ) : (
                  <Icon className="size-6" />
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
