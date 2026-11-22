"use client";

import type { ProfileData } from "@/data/portfolio";

export default function Hero({
  profile,
  stackHighlights,
  isOtpVerified,
  onOpenResume,
  onRequestOtpDownload,
}: {
  profile: ProfileData;
  stackHighlights: string[];
  isOtpVerified: boolean;
  onOpenResume: () => void;
  onRequestOtpDownload: () => void;
}) {
  const shortStack = stackHighlights
    .slice(0, 4)
    .map((s) => (s === "Django REST Framework" ? "Django DRF" : s));

  const apiLines = [
    `  "name": "${profile.name}",`,
    `  "role": "${profile.title}",`,
    `  "stack": [${shortStack.map((s) => `"${s}"`).join(", ")}],`,
    `  "education": "B.Tech in Computer Science (2025)",`,
    `  "location": "${profile.location}"`,
  ];

  return (
    <section id="top" className="py-14 md:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
            {profile.specialization}
          </p>

          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            {profile.name}
          </h1>

          <p className="mt-2 text-lg font-medium text-ink/90">
            {profile.title}
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            {profile.tagline}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#projects"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              Featured Projects
            </a>

            <button
              type="button"
              suppressHydrationWarning
              onClick={onOpenResume}
              className="rounded-md border border-line bg-panel px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent"
            >
              View Technical Resume
            </button>

            {isOtpVerified ? (
              <a
                href={profile.resume}
                download
                className="px-3 py-2.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                Download Full PDF ↗
              </a>
            ) : (
              <button
                type="button"
                suppressHydrationWarning
                onClick={onRequestOtpDownload}
                className="px-3 py-2.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                Download Full PDF (OTP) ↗
              </button>
            )}
          </div>
        </div>

        <div
          className="overflow-hidden rounded-lg border border-line bg-panel font-mono text-xs leading-6 sm:text-[13px]"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-muted">
            <span>GET /api/developers/apsara-r</span>
            <span className="font-semibold text-accent">200 OK</span>
          </div>
          <div className="px-4 py-4">
            <div>{"{"}</div>
            {apiLines.map((line, idx) => (
              <div
                key={idx}
                className="whitespace-pre-wrap break-words pl-3 -indent-3"
              >
                {line}
              </div>
            ))}
            <div>{"}"}</div>
          </div>
        </div>
      </div>

      {profile.telemetry && profile.telemetry.length > 0 && (
        <div className="mt-12 grid grid-cols-2 gap-4 border-t border-line pt-8 sm:grid-cols-4">
          {profile.telemetry.map((item) => (
            <div key={item.label}>
              <p className="font-display text-xl font-semibold text-ink sm:text-2xl">
                {item.value}
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink/90">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
