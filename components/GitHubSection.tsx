"use client";

import Section from "./Section";
import type { GitHubRepoItem, ProfileData } from "@/data/portfolio";

export default function GitHubSection({
  repos,
  profile,
  isOtpVerified,
  onOpenResume,
  onRequestOtpDownload,
}: {
  repos: GitHubRepoItem[];
  profile: ProfileData;
  isOtpVerified: boolean;
  onOpenResume: () => void;
  onRequestOtpDownload: () => void;
}) {
  return (
    <Section
      id="github"
      title="Open Source & Repositories"
      subtitle="Public codebases available for technical review on GitHub."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {repos.map((repo) => (
          <article
            key={repo.name}
            className="flex flex-col justify-between rounded-lg border border-line bg-panel/40 p-5"
          >
            <div>
              <p className="font-mono text-xs text-muted">{repo.language}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-ink">
                {repo.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {repo.description}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-4 border-t border-line pt-3.5 text-xs font-medium">
              <a
                href={repo.Url}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Repository ↗
              </a>
              {repo.demoUrl && (
                <a
                  href={repo.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  Live Demo ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-panel/40 p-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Technical Resume
          </h3>
          <p className="mt-1 text-sm text-muted">
            Preview the printable A4 technical resume online, or verify your
            email via OTP to unlock the direct phone number and original PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenResume}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            Preview A4 Resume
          </button>

          {isOtpVerified ? (
            <a
              href={profile.resume}
              download
              className="rounded-md border border-line bg-bg px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent"
            >
              Download Full PDF
            </a>
          ) : (
            <button
              type="button"
              suppressHydrationWarning
              onClick={onRequestOtpDownload}
              className="rounded-md border border-line bg-bg px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent"
            >
              Unlock Full PDF (Email OTP)
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}
