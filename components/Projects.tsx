"use client";

import Section from "./Section";
import type { ProjectItem } from "@/data/portfolio";

export default function Projects({ projects }: { projects: ProjectItem[] }) {
  return (
    <Section
      id="projects"
      title="Featured Projects & Case Studies"
      subtitle="Production applications detailing the business problem, architectural solution, technical stack, and engineering contributions."
    >
      <div className="divide-y divide-line">
        {projects.map((p) => (
          <article key={p.id || p.name} className="py-10 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-accent">{p.kind}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-ink">
                  {p.name}
                </h3>
              </div>

              {(p.demo || p.code) && (
                <div className="flex items-center gap-5 text-sm font-medium">
                  {p.demo && (
                    <a
                      href={p.demo}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline-offset-4 hover:underline"
                    >
                      Live Demo ↗
                    </a>
                  )}
                  {p.code && (
                    <a
                      href={p.code}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                      Source Code ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm leading-relaxed sm:grid-cols-[9rem_1fr] sm:text-base">
              <dt className="font-medium text-muted">Problem</dt>
              <dd className="text-ink">{p.problem}</dd>

              <dt className="font-medium text-muted">Solution</dt>
              <dd className="text-ink">{p.solution}</dd>

              {p.architectureHighlight && (
                <>
                  <dt className="font-medium text-muted">Architecture</dt>
                  <dd className="text-ink">{p.architectureHighlight}</dd>
                </>
              )}

              <dt className="font-medium text-muted">Contributions</dt>
              <dd>
                <ul className="list-disc space-y-1.5 pl-5 text-ink marker:text-accent">
                  {p.contribution.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </dd>

              <dt className="font-medium text-muted">Outcome</dt>
              <dd className="font-medium text-ink">{p.outcome}</dd>
            </dl>

            <ul className="mt-6 flex flex-wrap gap-2">
              {p.tech.map((t) => (
                <li
                  key={t}
                  className="rounded border border-line bg-panel/50 px-2.5 py-1 font-mono text-xs text-muted"
                >
                  {t}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
