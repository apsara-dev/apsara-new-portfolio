"use client";

import Section from "./Section";
import type { ArchitectureData } from "@/data/portfolio";

export default function SystemArchitecture({
  architecture,
}: {
  architecture: ArchitectureData;
}) {
  const blueprint = architecture?.blueprints?.[0];

  return (
    <Section
      id="architecture"
      title={architecture.headline}
      subtitle={architecture.subheadline}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {architecture.pillars.map((pillar) => (
          <div
            key={pillar.id}
            className="flex flex-col justify-between rounded-lg border border-line bg-panel/40 p-6"
          >
            <div>
              <p className="font-mono text-xs font-medium text-accent">
                {pillar.badge}
              </p>
              <h3 className="mt-1.5 font-display text-lg font-semibold text-ink">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {pillar.description}
              </p>
            </div>

            <ul className="mt-5 flex flex-wrap gap-2">
              {pillar.tech.map((t) => (
                <li
                  key={t}
                  className="rounded border border-line bg-bg px-2.5 py-0.5 font-mono text-xs text-muted"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {blueprint && (
        <div className="mt-8 rounded-lg border border-line bg-panel/40 p-6">
          <div className="border-b border-line pb-4">
            <p className="font-mono text-xs font-medium text-accent">
              Architecture Flow
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-ink">
              {blueprint.name}
            </h3>
            <p className="mt-1 text-sm text-muted">{blueprint.summary}</p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {blueprint.nodes.map((node) => (
              <div
                key={node.title}
                className="rounded border border-line bg-bg p-4"
              >
                <p className="font-mono text-xs font-medium text-accent">
                  {node.step}
                </p>
                <h4 className="mt-1.5 font-display text-base font-semibold text-ink">
                  {node.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {node.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
