import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { PortfolioPayload } from "@/data/portfolio";

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildA4ResumeHtml(
  data: PortfolioPayload,
  includeFullPhone = true
): string {
  const { profile, skills, experience, projects, architecture, education } =
    data;
  const phoneDisplay = includeFullPhone
    ? profile.phone
    : profile.phone.slice(0, 9) + " •••••";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(profile.name)} - Technical Resume</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      overflow: hidden;
      background: #ffffff;
      color: #000000;
      font-family: "Times New Roman", Georgia, Cambria, serif;
      font-size: 9.2pt;
      line-height: 1.32;
      -webkit-print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 10.5mm 14mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    header {
      text-align: center;
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #000000;
      line-height: 1.1;
    }
    .subtitle {
      font-size: 9.8pt;
      font-weight: 700;
      color: #1f2937;
      margin-top: 3px;
    }
    .contact-bar {
      margin-top: 4px;
      font-size: 9pt;
      color: #111827;
    }
    .contact-bar a {
      color: #000000;
      text-decoration: none;
    }
    h2 {
      font-size: 9.8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.13em;
      border-bottom: 1.4px solid #000000;
      padding-bottom: 1.5px;
      margin-bottom: 4px;
      color: #000000;
    }
    p.summary {
      text-align: justify;
      font-size: 9.2pt;
      line-height: 1.35;
    }
    ul {
      padding-left: 16px;
    }
    li {
      margin-bottom: 1.8px;
      font-size: 9.1pt;
      line-height: 1.32;
    }
    .row-between {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: 700;
      font-size: 9.4pt;
    }
    .proj-block {
      margin-bottom: 5.5px;
    }
    .proj-block:last-child {
      margin-bottom: 0;
    }
    .proj-sol {
      font-style: italic;
      font-size: 8.9pt;
      color: #1f2937;
      margin: 1px 0 2px 0;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 16px;
      row-gap: 2px;
      padding-left: 16px;
    }
    .edu-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2.5px;
      font-size: 9.2pt;
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <h1>${escapeHtml(profile.name)}</h1>
      <div class="subtitle">${escapeHtml(profile.title)} &bull; ${escapeHtml(profile.specialization)}</div>
      <div class="contact-bar">
        ${escapeHtml(profile.location)} &nbsp;|&nbsp; ${escapeHtml(phoneDisplay)} &nbsp;|&nbsp;
        <a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a> &nbsp;|&nbsp;
        <a href="${escapeHtml(profile.linkedin)}">LinkedIn</a> &nbsp;|&nbsp;
        <a href="${escapeHtml(profile.github)}">GitHub (${escapeHtml(profile.github.replace("https://github.com/", ""))})</a>
      </div>
    </header>

    <section>
      <h2>Professional Summary</h2>
      <p class="summary">
        ${escapeHtml(profile.positioning)} ${escapeHtml(profile.tagline)} Experienced in architecting stateless JWT authentication pipelines, normalized relational database schemas (PostgreSQL, MySQL), RESTful APIs, and applied deep learning classification models.
      </p>
    </section>

    <section>
      <h2>Technical Skills</h2>
      <ul>
        ${skills
          .map(
            (sk) =>
              `<li><strong>${escapeHtml(sk.group)}:</strong> ${escapeHtml(sk.items.join(", "))}</li>`
          )
          .join("\n        ")}
      </ul>
    </section>

    <section>
      <h2>Professional Experience</h2>
      ${experience
        .map(
          (exp) => `
      <div>
        <div class="row-between">
          <span>${escapeHtml(exp.role)} – ${escapeHtml(exp.company)}, ${escapeHtml(exp.place)}</span>
          <span>${escapeHtml(exp.period)}</span>
        </div>
        <ul style="margin-top: 3px;">
          ${exp.points.map((pt) => `<li>${escapeHtml(pt)}</li>`).join("\n          ")}
        </ul>
      </div>`
        )
        .join("\n")}
    </section>

    <section>
      <h2>Technical Projects &amp; Case Studies</h2>
      ${projects
        .map(
          (proj) => `
      <div class="proj-block">
        <div class="row-between">
          <span>${escapeHtml(proj.name)}</span>
          <span style="font-size: 8.8pt; font-weight: 600;">${escapeHtml(proj.tech.slice(0, 6).join(", "))}</span>
        </div>
        <div class="proj-sol">${escapeHtml(proj.solution)}</div>
        <ul>
          ${proj.contribution
            .slice(0, 3)
            .map((c) => `<li>${escapeHtml(c)}</li>`)
            .join("\n          ")}
          <li><strong>Outcome:</strong> ${escapeHtml(proj.outcome)}${proj.demo ? ` (Live Demo: ${escapeHtml(proj.demo)})` : ""}</li>
        </ul>
      </div>`
        )
        .join("\n")}
    </section>

    ${
      architecture?.pillars?.length
        ? `<section>
      <h2>Core Engineering &amp; Architectural Competencies</h2>
      <ul class="grid-2">
        ${architecture.pillars
          .map(
            (p) =>
              `<li><strong>${escapeHtml(p.title)}:</strong> ${escapeHtml(p.tech.join(", "))}</li>`
          )
          .join("\n        ")}
      </ul>
    </section>`
        : ""
    }

    <section>
      <h2>Education</h2>
      ${education
        .map(
          (ed) => `
      <div class="edu-row">
        <span><strong>${escapeHtml(ed.title)}</strong> – ${escapeHtml(ed.school)}</span>
        <span><strong>${escapeHtml(ed.period)} | ${escapeHtml(ed.detail)}</strong></span>
      </div>`
        )
        .join("\n")}
    </section>
  </div>
</body>
</html>`;
}

export function regenerateA4ResumePdf(data: PortfolioPayload): boolean {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const dataDir = path.join(process.cwd(), "data");
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });

    const chromeCandidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    const browserBin = chromeCandidates.find((p) => fs.existsSync(p));
    if (!browserBin) return false;

    // 1. Generate Protected Full-Phone PDF in data/Apsara_R_Resume_Full.pdf
    const fullHtmlPath = path.join(dataDir, "resume_render_full.html");
    const fullPdfPath = path.join(dataDir, "Apsara_R_Resume_Full.pdf");
    fs.writeFileSync(fullHtmlPath, buildA4ResumeHtml(data, true), "utf-8");
    execFileSync(
      browserBin,
      [
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        `--print-to-pdf=${fullPdfPath}`,
        "file:///" + fullHtmlPath.replace(/\\/g, "/"),
      ],
      { timeout: 15000, stdio: "ignore" }
    );
    try {
      fs.unlinkSync(fullHtmlPath);
    } catch {}

    // 2. Generate Public Phone-Masked PDF in public/Apsara_R_Resume.pdf
    const publicHtmlPath = path.join(dataDir, "resume_render_public.html");
    const publicPdfPath = path.join(publicDir, "Apsara_R_Resume.pdf");
    fs.writeFileSync(publicHtmlPath, buildA4ResumeHtml(data, false), "utf-8");
    execFileSync(
      browserBin,
      [
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        `--print-to-pdf=${publicPdfPath}`,
        "file:///" + publicHtmlPath.replace(/\\/g, "/"),
      ],
      { timeout: 15000, stdio: "ignore" }
    );
    try {
      fs.unlinkSync(publicHtmlPath);
    } catch {}

    return true;
  } catch (err) {
    console.warn("PDF regeneration skipped:", err);
    return false;
  }
}
