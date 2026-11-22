"use client";

import Section from "./Section";
import type { ExperienceItem, EducationItem } from "@/data/portfolio";

export default function Experience({
  experience,
  education,
}: {
  experience: ExperienceItem[];
  education: EducationItem[];
}) {
  return (
    <Section
      id="experience"
      title="Experience & Education"
      subtitle="Professional software development experience and academic background."
    >
      <div className="grid gap-12 lg:grid-cols-[1.35fr_0.85fr]">
        <div>
          <h3 className="mb-6 font-mono text-xs font-medium uppercase tracking-widest text-muted">
            Work Experience
          </h3>

          <div className="space-y-8">
            {experience.map((e) => (
              <article key={e.company + e.period}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-display text-xl font-semibold text-ink">
                    {e.role}
                  </h4>
                  <span className="font-mono text-xs text-muted">
                    {e.period}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-accent">
                  {e.company} — <span className="text-muted">{e.place}</span>
                </p>

                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink marker:text-accent sm:text-base">
                  {e.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>

                {e.tech && e.tech.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {e.tech.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-line bg-panel/50 px-2.5 py-0.5 font-mono text-xs text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-6 font-mono text-xs font-medium uppercase tracking-widest text-muted">
            Education
          </h3>

          <ul className="space-y-6">
            {education.map((ed) => (
              <li key={ed.title} className="border-l-2 border-accent pl-4">
                <p className="font-display text-base font-semibold text-ink">
                  {ed.title}
                </p>
                <p className="mt-0.5 text-sm text-muted">{ed.school}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {ed.period} • {ed.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
