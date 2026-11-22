"use client";

import ThemeToggle from "./ThemeToggle";
import type { ProfileData } from "@/data/portfolio";

const links = [
  { href: "#architecture", label: "Architecture" },
  { href: "#projects", label: "Case Studies" },
  { href: "#experience", label: "Experience" },
  { href: "#skills", label: "Skills" },
  { href: "#github", label: "GitHub" },
  { href: "#contact", label: "Contact" },
];

export default function Header({
  profile,
  onOpenResume,
}: {
  profile: ProfileData;
  onOpenResume: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight hover:text-accent"
        >
          {profile.name}
        </a>

        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden font-medium text-muted transition-colors hover:text-ink lg:inline"
            >
              {l.label}
            </a>
          ))}

          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenResume}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent sm:text-sm"
          >
            ATS Resume
          </button>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
