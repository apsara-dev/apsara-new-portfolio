"use client";

import type { PortfolioPayload } from "@/data/portfolio";

export default function ResumeModal({
  isOpen,
  onClose,
  data,
  isOtpVerified,
  unlockedPhone,
  onRequestOtp,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: PortfolioPayload;
  isOtpVerified: boolean;
  unlockedPhone: string;
  onRequestOtp: () => void;
}) {
  if (!isOpen) return null;

  const { profile, projects, experience, skills, education, architecture } =
    data;
  const maskedPhone = "+91 90376 •••••";
  const displayPhone =
    isOtpVerified && unlockedPhone && !unlockedPhone.includes("•")
      ? unlockedPhone
      : maskedPhone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[95vh] w-full max-w-[235mm] flex-col overflow-hidden rounded-xl border border-line bg-bg shadow-2xl">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-5 py-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
              A4 Technical Resume — {profile.name}
            </span>
            {!isOtpVerified && (
              <span className="rounded border border-line bg-bg px-2 py-0.5 font-mono text-[11px] text-muted">
                Phone Masked (Verify Email OTP to Unlock)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isOtpVerified ? (
              <button
                type="button"
                onClick={onRequestOtp}
                className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-medium text-bg transition-opacity hover:opacity-90"
              >
                Verify Email OTP to Unlock Phone & PDF
              </button>
            ) : (
              <a
                href={profile.resume}
                download="Apsara_R_Resume.pdf"
                className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-medium text-bg transition-opacity hover:opacity-90"
              >
                Download Original A4 PDF
              </a>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-line bg-bg px-3.5 py-1.5 text-xs font-medium text-ink hover:border-accent"
            >
              Print / Save A4 PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable Preview Container */}
        <div className="overflow-y-auto bg-neutral-800/90 p-4 sm:p-8">
          {/* Exact Single-Page A4 Sheet: 210mm x 297mm, Full-Height Flex Distribution */}
          <div
            id="ats-resume-sheet"
            className="mx-auto flex h-[297mm] min-h-[297mm] max-h-[297mm] w-full max-w-[210mm] flex-col justify-between overflow-hidden bg-white px-[14mm] py-[10.5mm] font-serif text-[9.2pt] leading-[1.32] text-black shadow-2xl"
          >
            {/* TOP & MIDDLE CONTENT */}
            <div className="flex h-full flex-col justify-between">
              {/* 1. HEADER */}
              <header className="text-center">
                <h1 className="text-[20pt] font-bold leading-tight tracking-[0.08em] text-black">
                  {profile.name.toUpperCase()}
                </h1>
                <p className="mt-0.5 text-[9.8pt] font-bold tracking-wide text-neutral-800">
                  {profile.title} • {profile.specialization}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 text-[9pt] text-neutral-900">
                  <span>{profile.location}</span>
                  <span>|</span>
                  <span className="inline-flex items-center gap-1">
                    <span>{displayPhone}</span>
                    {!isOtpVerified && (
                      <button
                        type="button"
                        onClick={onRequestOtp}
                        className="rounded border border-neutral-400 bg-neutral-100 px-1.5 py-0 text-[8pt] font-sans font-semibold text-teal-900 hover:bg-neutral-200 print:hidden"
                      >
                        Unlock OTP
                      </button>
                    )}
                  </span>
                  <span>|</span>
                  <a
                    href={`mailto:${profile.email}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {profile.email}
                  </a>
                  <span>|</span>
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    LinkedIn
                  </a>
                  <span>|</span>
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    GitHub ({profile.github.replace("https://github.com/", "")})
                  </a>
                </div>
              </header>

              {/* 2. PROFESSIONAL SUMMARY */}
              <section>
                <h2 className="border-b-[1.4px] border-black pb-0.5 text-[9.8pt] font-bold uppercase tracking-[0.13em] text-black">
                  Professional Summary
                </h2>
                <p className="mt-1 text-justify text-[9.2pt] leading-[1.35] text-neutral-900">
                  {profile.positioning} {profile.tagline} Experienced in
                  designing stateless JWT authentication pipelines, normalized
                  relational schemas (PostgreSQL, MySQL), RESTful APIs, and
                  applied deep learning classification models.
                </p>
              </section>

              {/* 3. TECHNICAL SKILLS */}
              <section>
                <h2 className="border-b-[1.4px] border-black pb-0.5 text-[9.8pt] font-bold uppercase tracking-[0.13em] text-black">
                  Technical Skills
                </h2>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[9.1pt] leading-[1.32] text-neutral-900">
                  {skills.map((sk) => (
                    <li key={sk.group}>
                      <strong className="font-bold text-black">
                        {sk.group}:
                      </strong>{" "}
                      {sk.items.join(", ")}
                    </li>
                  ))}
                </ul>
              </section>

              {/* 4. PROFESSIONAL / INTERNSHIP EXPERIENCE */}
              <section>
                <h2 className="border-b-[1.4px] border-black pb-0.5 text-[9.8pt] font-bold uppercase tracking-[0.13em] text-black">
                  Professional Experience
                </h2>
                <div className="mt-1 space-y-2">
                  {experience.map((exp) => (
                    <div key={exp.company + exp.period}>
                      <div className="flex flex-wrap items-baseline justify-between text-[9.4pt] font-bold text-black">
                        <span>
                          {exp.role} – {exp.company}, {exp.place}
                        </span>
                        <span className="text-[9pt]">{exp.period}</span>
                      </div>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[9.1pt] leading-[1.32] text-neutral-900">
                        {exp.points.map((pt) => (
                          <li key={pt}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. TECHNICAL PROJECTS & CASE STUDIES */}
              <section>
                <h2 className="border-b-[1.4px] border-black pb-0.5 text-[9.8pt] font-bold uppercase tracking-[0.13em] text-black">
                  Technical Projects & Case Studies
                </h2>
                <div className="mt-1 space-y-2">
                  {projects.map((proj) => (
                    <div key={proj.name}>
                      <div className="flex flex-wrap items-baseline justify-between text-[9.4pt]">
                        <span className="font-bold text-black">
                          {proj.name}
                        </span>
                        <span className="text-[8.8pt] font-semibold text-neutral-800">
                          {proj.tech.slice(0, 6).join(", ")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[8.9pt] italic text-neutral-800">
                        {proj.solution}
                      </p>
                      <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[9.1pt] leading-[1.3] text-neutral-900">
                        {proj.contribution.slice(0, 3).map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                        <li>
                          <strong>Outcome:</strong> {proj.outcome}
                          {proj.demo ? ` (Live Demo: ${proj.demo})` : ""}
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6. SYSTEM ARCHITECTURE & ENGINEERING COMPETENCIES */}
              {architecture?.pillars && architecture.pillars.length > 0 && (
                <section>
                  <h2 className="border-b-[1.4px] border-black pb-0.5 text-[9.8pt] font-bold uppercase tracking-[0.13em] text-black">
                    Core Engineering & Architectural Competencies
                  </h2>
                  <ul className="mt-1 grid list-disc grid-cols-1 gap-x-4 gap-y-0.5 pl-4 text-[9pt] leading-[1.3] text-neutral-900 sm:grid-cols-2">
                    {architecture.pillars.map((p) => (
                      <li key={p.id}>
                        <strong className="font-bold text-black">
                          {p.title}:
                        </strong>{" "}
                        {p.tech.join(", ")}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 7. EDUCATION */}
              <section>
                <h2 className="border-b-[1.4px] border-black pb-0.5 text-[9.8pt] font-bold uppercase tracking-[0.13em] text-black">
                  Education
                </h2>
                <div className="mt-1 space-y-1 text-[9.2pt] text-neutral-900">
                  {education.map((ed) => (
                    <div
                      key={ed.title}
                      className="flex flex-wrap items-baseline justify-between"
                    >
                      <div>
                        <strong className="font-bold text-black">
                          {ed.title}
                        </strong>{" "}
                        – {ed.school}
                      </div>
                      <span className="font-semibold text-black">
                        {ed.period} | {ed.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
