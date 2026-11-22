# Apsara R — Software Engineer & Python Full-Stack Portfolio

An engineering-first portfolio built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and a **Bi-Directional SQLite (`data/portfolio.db`) ⇄ JSON (`data/portfolio.json`) Backend Synchronization Engine**.

---

## 🌟 8 Core Engineering Portfolio Pillars Implemented

1. **Clear 5-Second Hero & Value Proposition (`components/Hero.tsx`)**
   - Immediate engineering identity (**Apsara R — Software Engineer • Python Full Stack Developer**), core specialization (`Python • Django REST Framework • PostgreSQL & MySQL • React.js`), telemetry metrics (`3+ Production Systems`, `100% Stateless JWT & RBAC`, `85% BiLSTM Accuracy`), and primary CTAs (**View Technical Resume** & **Featured Projects**).
2. **System Design & Architectural Depth (`components/SystemArchitecture.tsx`)**
   - 4 architectural pillars (Stateless JWT & RBAC, Idempotent Batch Transactions, Relational Schema & Sync Engine, Acoustic BiLSTM Signal Pipeline) plus an **Interactive Architecture Blueprint Switcher**.
3. **Production Case Studies — 4-Part Framework (`components/Projects.tsx`)**
   - Every featured project documents:
     1. **Business Problem**
     2. **Engineered Solution & Architecture Depth**
     3. **Individual Engineering Contributions**
     4. **Tech Stack & Measured Outcome**
4. **Work Experience Timeline — Google X-Y-Z Impact Framework (`components/Experience.tsx`)**
   - Full Stack Python Developer experience at **Kompetenzen Technologies** written with quantified engineering impact, alongside academic credentials.
5. **Categorized Technical Skills — Zero Percentage Bars (`components/Skills.tsx`)**
   - Cleanly organized into **Backend & API Engineering**, **Databases & Data Architecture**, **Frontend & Full-Stack Web**, and **AI/ML, Cloud & DevOps Tooling**.
6. **1-Click ATS-Compliant A4 Technical Resume (`components/ResumeModal.tsx`)**
   - Live single-page A4 printable/save-to-PDF technical resume dynamically hydrated from the backend DB/JSON + direct download of `/Apsara_R_Resume.pdf`.
7. **Public Proof of Code — GitHub Repositories (`components/GitHubSection.tsx`)**
   - Verified cards linking directly to `apsara-dev/employee-attendance-system`, `apsara-dev/expense-tracker-frontend`, and `apsara-dev/apsara-r-portfolio`.
8. **Secure Contact Channels & Anti-Spam Phone Gate (`components/Contact.tsx`)**
   - Direct email copy/mailto, LinkedIn, GitHub, an **Anti-Spam Protected Phone Reveal Gate**, and a backend-persisted **Direct Message Form** (`POST /api/contact`).

---

## 🔄 Bi-Directional Database (`data/portfolio.db`) ⇄ JSON (`data/portfolio.json`) Sync

All portfolio content is served dynamically through the backend (`lib/db.ts`):

- **Edit `data/portfolio.json` directly in your editor:** The backend computes the SHA-256 hash of `data/portfolio.json` on each request and automatically hydrates all relational tables in `data/portfolio.db` (SQLite).
- **Update via the UI or REST API (`PUT /api/portfolio`):** The backend writes changes atomically to **both** `data/portfolio.db` (SQLite) and `data/portfolio.json`!
- **Interactive Sync Studio:** Click the **`DB ⇄ JSON Synced`** pill in the top header to open the live Backend Sync Studio and trigger manual `JSON → DB` or `DB → JSON` synchronization or edit profile fields live.

---

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.
