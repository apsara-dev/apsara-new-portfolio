"use client";

import Section from "./Section";
import type { SkillGroup } from "@/data/portfolio";

export default function Skills({ skills }: { skills: SkillGroup[] }) {
  return (
    <Section
      id="skills"
      title="Technical Skills"
      subtitle="Core technologies categorized across backend, database, frontend, and machine learning."
    >
      <dl className="divide-y divide-line">
        {skills.map((s) => (
          <div
            key={s.group}
            className="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[15rem_1fr] sm:gap-8"
          >
            <div>
              <dt className="font-display text-base font-semibold text-ink">
                {s.group}
              </dt>
              {s.description && (
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {s.description}
                </p>
              )}
            </div>
            <dd className="flex flex-wrap items-start gap-2">
              {s.items.map((item) => (
                <span
                  key={item}
                  className="rounded border border-line bg-panel/50 px-3 py-1 font-mono text-xs font-medium text-ink"
                >
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
