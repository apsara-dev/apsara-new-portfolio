"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  PortfolioPayload,
  ProjectItem,
  ExperienceItem,
  EducationItem,
  SkillGroup,
  GitHubRepoItem,
} from "@/data/portfolio";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

interface PhoneViewLog {
  id: number;
  viewer_name: string;
  viewer_email: string;
  company: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

type AdminTab =
  | "profile"
  | "projects"
  | "experience"
  | "skills"
  | "architecture"
  | "github"
  | "messages"
  | "phone_views"
  | "email"
  | "sync";

export default function AdminPanelPage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>("profile");
  const [data, setData] = useState<PortfolioPayload | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [phoneLogs, setPhoneLogs] = useState<PhoneViewLog[]>([]);
  const [emailConfig, setEmailConfig] = useState({
    gmailUser: "apsarababu77@gmail.com",
    gmailAppPassword: "",
    recipientEmail: "apsarababu77@gmail.com",
    enableAutoReply: true,
    hasAppPassword: false,
  });
  const [supabaseConfig, setSupabaseConfig] = useState({
    configured: false,
    mode: "none",
    supabaseUrl: "",
    supabaseKey: "",
    databaseUrl: "",
    sqlSchema: "",
  });
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [rawJsonText, setRawJsonText] = useState("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("portfolio_admin_token") || ""
        : "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchAllAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [pRes, mRes, eRes, phRes, sbRes] = await Promise.all([
        fetch("/api/portfolio?admin=1", { cache: "no-store", headers }),
        fetch("/api/contact", { cache: "no-store", headers }),
        fetch("/api/admin/email", { cache: "no-store", headers }),
        fetch("/api/phone-access", { cache: "no-store", headers }),
        fetch("/api/admin/supabase", { cache: "no-store", headers }),
      ]);

      if (mRes.status === 401 || eRes.status === 401) {
        localStorage.removeItem("portfolio_admin_token");
        setIsAuthenticated(false);
        return;
      }

      if (pRes.ok) {
        const portfolio = (await pRes.json()) as PortfolioPayload;
        setData(portfolio);
        setRawJsonText(JSON.stringify(portfolio, null, 2));
      }
      if (mRes.ok) {
        const mJson = await mRes.json();
        setMessages(mJson.messages || []);
      }
      if (phRes.ok) {
        const phJson = await phRes.json();
        setPhoneLogs(phJson.logs || []);
      }
      if (eRes.ok) {
        const eJson = await eRes.json();
        setEmailConfig({
          gmailUser: eJson.gmailUser || "apsarababu77@gmail.com",
          gmailAppPassword: eJson.maskedAppPassword || "",
          recipientEmail: eJson.recipientEmail || "apsarababu77@gmail.com",
          enableAutoReply: Boolean(eJson.enableAutoReply),
          hasAppPassword: Boolean(eJson.hasAppPassword),
        });
      }
      if (sbRes.ok) {
        const sbJson = await sbRes.json();
        setSupabaseConfig({
          configured: Boolean(sbJson.configured),
          mode: sbJson.mode || "none",
          supabaseUrl: sbJson.supabaseUrl || "",
          supabaseKey: sbJson.maskedSupabaseKey || "",
          databaseUrl: sbJson.maskedDatabaseUrl || "",
          sqlSchema: sbJson.sqlSchema || "",
        });
      }
    } catch (err) {
      console.error("Failed loading admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("portfolio_admin_token");
    if (token && token !== "apsara-admin-session-v1") {
      setIsAuthenticated(true);
      fetchAllAdminData();
    } else if (token === "apsara-admin-session-v1") {
      localStorage.removeItem("portfolio_admin_token");
    }
  }, [fetchAllAdminData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Invalid credentials");
      }
      localStorage.setItem("portfolio_admin_token", json.token);
      setIsAuthenticated(true);
      fetchAllAdminData();
    } catch (err: any) {
      setLoginError(err?.message || "Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("portfolio_admin_token");
    setIsAuthenticated(false);
  };

  const handleSavePortfolio = async (updatedPayload?: PortfolioPayload) => {
    const payloadToSave = updatedPayload || data;
    if (!payloadToSave) return;

    setSaving(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payloadToSave),
      });
      const saved = await res.json();
      if (!res.ok) {
        throw new Error(saved.error || "Failed to save changes");
      }
      setData(saved);
      setRawJsonText(JSON.stringify(saved, null, 2));
      showToast(
        "Saved! Both SQLite Database (portfolio.db) and data/portfolio.json are updated."
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleForceSync = async (direction: "json-to-db" | "db-to-json") => {
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio/sync", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ direction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      if (json.data) {
        setData(json.data);
        setRawJsonText(JSON.stringify(json.data, null, 2));
      }
      showToast(
        direction === "json-to-db"
          ? "Synced data/portfolio.json → SQLite Database (portfolio.db)"
          : "Exported SQLite Database (portfolio.db) → data/portfolio.json"
      );
    } catch (err: any) {
      showToast(err?.message || "Sync failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      const res = await fetch(`/api/contact?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages || []);
        showToast("Message deleted from database and JSON.");
      }
    } catch {
      showToast("Failed to delete message", "error");
    }
  };

  const handleDeletePhoneLog = async (id: number) => {
    try {
      const res = await fetch(`/api/phone-access?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setPhoneLogs(json.logs || []);
        showToast("Phone view log deleted.");
      }
    } catch {
      showToast("Failed to delete phone log", "error");
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-bg" />;
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md rounded-xl border border-line bg-panel p-8 shadow-sm">
          <div className="mb-6">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
              Portfolio Backend CMS
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink">
              Admin Login
            </h1>
            <p className="mt-1 text-xs text-muted">
              Sign in to manage portfolio content, projects, skills, and DB ⇄
              JSON synchronization.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted">
                Username
              </label>
              <input
                type="text"
                required
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                placeholder="admin"
                className="mt-1 w-full rounded-md border border-line bg-bg px-3.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted">
                Password
              </label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                placeholder="••••••••"
                className="mt-1 w-full rounded-md border border-line bg-bg px-3.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            {loginError && (
              <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loggingIn ? "Signing in..." : "Sign In to Admin Panel"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
            <span>Default: admin / admin@123</span>
            <a href="/" className="text-accent hover:underline">
              ← Back to Portfolio
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted">
        Loading Backend Database & JSON state...
      </div>
    );
  }

  // Helper updaters
  const updateProfileField = (field: string, value: any) => {
    setData({
      ...data,
      profile: {
        ...data.profile,
        [field]: value,
      },
    });
  };

  const addProject = () => {
    const newProj: ProjectItem = {
      id: `project-${Date.now()}`,
      name: "New Engineering Project",
      kind: "Full-Stack Web Application",
      featured: true,
      metrics: "REST API • Relational DB",
      problem: "Describe the business problem solved by this system.",
      solution: "Describe the technical architecture and solution built.",
      architectureHighlight: "Key backend, database, or security design detail.",
      contribution: ["Designed and built the core architecture"],
      outcome: "Deployed and verified.",
      tech: ["Python", "Django", "React"],
      demo: "",
      code: "https://github.com/apsara-dev",
    };
    setData({ ...data, projects: [newProj, ...data.projects] });
  };

  const updateProject = (idx: number, patch: Partial<ProjectItem>) => {
    const next = [...data.projects];
    next[idx] = { ...next[idx], ...patch };
    setData({ ...data, projects: next });
  };

  const removeProject = (idx: number) => {
    setData({
      ...data,
      projects: data.projects.filter((_, i) => i !== idx),
    });
  };

  const addExperience = () => {
    const newExp: ExperienceItem = {
      id: `exp-${Date.now()}`,
      role: "Software Engineer",
      company: "Company Name",
      place: "Kerala, India",
      period: "2025 – Present",
      tech: ["Python", "Django", "React"],
      points: ["Engineered scalable full-stack web features."],
    };
    setData({ ...data, experience: [newExp, ...data.experience] });
  };

  const updateExperience = (idx: number, patch: Partial<ExperienceItem>) => {
    const next = [...data.experience];
    next[idx] = { ...next[idx], ...patch };
    setData({ ...data, experience: next });
  };

  const removeExperience = (idx: number) => {
    setData({
      ...data,
      experience: data.experience.filter((_, i) => i !== idx),
    });
  };

  const addEducation = () => {
    const newEd: EducationItem = {
      title: "Degree / Certification",
      school: "Institution Name",
      period: "2025",
      detail: "Score / CGPA",
    };
    setData({ ...data, education: [...data.education, newEd] });
  };

  const updateEducation = (idx: number, patch: Partial<EducationItem>) => {
    const next = [...data.education];
    next[idx] = { ...next[idx], ...patch };
    setData({ ...data, education: next });
  };

  const removeEducation = (idx: number) => {
    setData({
      ...data,
      education: data.education.filter((_, i) => i !== idx),
    });
  };

  const addSkillGroup = () => {
    const newGroup: SkillGroup = {
      group: "New Skill Category",
      description: "Category description",
      items: ["Skill 1", "Skill 2"],
    };
    setData({ ...data, skills: [...data.skills, newGroup] });
  };

  const updateSkillGroup = (idx: number, patch: Partial<SkillGroup>) => {
    const next = [...data.skills];
    next[idx] = { ...next[idx], ...patch };
    setData({ ...data, skills: next });
  };

  const removeSkillGroup = (idx: number) => {
    setData({
      ...data,
      skills: data.skills.filter((_, i) => i !== idx),
    });
  };

  const addRepo = () => {
    const newRepo: GitHubRepoItem = {
      name: "new-repository",
      fullName: "apsara-dev/new-repository",
      description: "Repository description",
      language: "Python • React",
      Url: "https://github.com/apsara-dev",
      demoUrl: "",
      highlights: ["REST API", "Full-Stack"],
    };
    setData({ ...data, githubRepos: [...data.githubRepos, newRepo] });
  };

  const updateRepo = (idx: number, patch: Partial<GitHubRepoItem>) => {
    const next = [...data.githubRepos];
    next[idx] = { ...next[idx], ...patch };
    setData({ ...data, githubRepos: next });
  };

  const removeRepo = (idx: number) => {
    setData({
      ...data,
      githubRepos: data.githubRepos.filter((_, i) => i !== idx),
    });
  };

  const tabs: Array<{ id: AdminTab; label: string; count?: number }> = [
    { id: "profile", label: "Profile & Hero" },
    { id: "projects", label: "Projects", count: data.projects.length },
    {
      id: "experience",
      label: "Experience & Education",
      count: data.experience.length,
    },
    { id: "skills", label: "Technical Skills", count: data.skills.length },
    { id: "architecture", label: "System Architecture" },
    { id: "github", label: "GitHub Repos", count: data.githubRepos.length },
    { id: "messages", label: "Contact Inbox", count: messages.length },
    {
      id: "phone_views",
      label: "Phone Views Log",
      count: phoneLogs.length,
    },
    { id: "email", label: "Email (Primary Inbox)" },
    { id: "sync", label: "DB ⇄ JSON Sync" },
  ];

  const handleSaveEmailSettings = async (sendTest = false) => {
    setTestingEmail(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...emailConfig,
          sendTest,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save email settings");
      }
      showToast(json.message || "Email settings saved!");
      fetchAllAdminData();
    } catch (err: any) {
      showToast(err?.message || "Email setup failed", "error");
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="rounded bg-accent px-2.5 py-1 font-mono text-xs font-bold text-bg">
              ADMIN CMS
            </span>
            <div>
              <h1 className="font-display text-base font-bold text-ink">
                {data.profile.name} — Portfolio Backend Manager
              </h1>
              <p className="font-mono text-[11px] text-muted">
                SQLite (data/portfolio.db) ⇄ JSON (data/portfolio.json) Auto-Sync
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleSavePortfolio()}
              disabled={saving}
              className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes (DB + JSON)"}
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-line bg-bg px-3.5 py-2 text-xs font-medium text-ink hover:border-accent"
            >
              View Live Site ↗
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-line bg-bg px-3 py-2 text-xs font-medium text-muted hover:text-ink"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-lg border border-accent bg-panel px-4 py-3 text-xs font-semibold text-ink shadow-xl">
          <span
            className={
              toast.type === "error" ? "text-red-500" : "text-accent"
            }
          >
            {toast.text}
          </span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[15rem_1fr]">
        {/* Sidebar Tabs */}
        <aside className="space-y-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? "bg-accent text-bg"
                  : "border border-transparent bg-panel/60 text-muted hover:border-line hover:text-ink"
              }`}
            >
              <span>{t.label}</span>
              {typeof t.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                    activeTab === t.id
                      ? "bg-bg/20 text-bg"
                      : "bg-bg text-muted"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Active Tab Editor */}
        <div className="rounded-xl border border-line bg-panel/40 p-6">
          {/* TAB 1: PROFILE & HERO */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <h2 className="font-display text-xl font-bold text-ink">
                  1. Profile & Hero Section
                </h2>
                <p className="text-xs text-muted">
                  Edit your name, role title, specialization, value proposition,
                  contact details, and hero metrics.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={data.profile.name}
                    onChange={(e) => updateProfileField("name", e.target.value)}
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={data.profile.title}
                    onChange={(e) =>
                      updateProfileField("title", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted">
                    Core Specialization Line
                  </label>
                  <input
                    type="text"
                    value={data.profile.specialization}
                    onChange={(e) =>
                      updateProfileField("specialization", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted">
                    Hero Tagline (Value Proposition)
                  </label>
                  <input
                    type="text"
                    value={data.profile.tagline}
                    onChange={(e) =>
                      updateProfileField("tagline", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted">
                    Executive Summary (Used in Resume & Meta)
                  </label>
                  <textarea
                    rows={2}
                    value={data.profile.positioning}
                    onChange={(e) =>
                      updateProfileField("positioning", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={data.profile.email}
                    onChange={(e) =>
                      updateProfileField("email", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={data.profile.phone}
                    onChange={(e) =>
                      updateProfileField("phone", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Location
                  </label>
                  <input
                    type="text"
                    value={data.profile.location}
                    onChange={(e) =>
                      updateProfileField("location", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Availability Status
                  </label>
                  <input
                    type="text"
                    value={data.profile.availability}
                    onChange={(e) =>
                      updateProfileField("availability", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    LinkedIn URL
                  </label>
                  <input
                    type="text"
                    value={data.profile.linkedin}
                    onChange={(e) =>
                      updateProfileField("linkedin", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    GitHub Profile URL
                  </label>
                  <input
                    type="text"
                    value={data.profile.github}
                    onChange={(e) =>
                      updateProfileField("github", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted">
                    Stack Highlights (Comma separated, shown in Hero API Card)
                  </label>
                  <input
                    type="text"
                    value={data.stackHighlights.join(", ")}
                    onChange={(e) =>
                      setData({
                        ...data,
                        stackHighlights: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              {/* Hero Telemetry Cards */}
              <div className="border-t border-line pt-5">
                <h3 className="text-sm font-bold text-ink">
                  Hero Telemetry Highlights (4 Cards)
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {data.profile.telemetry.map((t, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-lg border border-line bg-bg p-3.5"
                    >
                      <input
                        type="text"
                        value={t.value}
                        onChange={(e) => {
                          const next = [...data.profile.telemetry];
                          next[idx] = { ...next[idx], value: e.target.value };
                          updateProfileField("telemetry", next);
                        }}
                        placeholder="Heading (e.g. Python & DRF)"
                        className="w-full rounded border border-line bg-panel px-2.5 py-1.5 text-xs font-bold text-ink"
                      />
                      <input
                        type="text"
                        value={t.label}
                        onChange={(e) => {
                          const next = [...data.profile.telemetry];
                          next[idx] = { ...next[idx], label: e.target.value };
                          updateProfileField("telemetry", next);
                        }}
                        placeholder="Label (e.g. Backend Engineering)"
                        className="w-full rounded border border-line bg-panel px-2.5 py-1.5 text-xs text-ink"
                      />
                      <input
                        type="text"
                        value={t.detail}
                        onChange={(e) => {
                          const next = [...data.profile.telemetry];
                          next[idx] = { ...next[idx], detail: e.target.value };
                          updateProfileField("telemetry", next);
                        }}
                        placeholder="Detail"
                        className="w-full rounded border border-line bg-panel px-2.5 py-1.5 text-xs text-muted"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTS & CASE STUDIES */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">
                    2. Featured Projects & Case Studies
                  </h2>
                  <p className="text-xs text-muted">
                    Add, edit, or delete portfolio projects (Problem, Solution,
                    Architecture, Contributions, Tech Stack).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addProject}
                  className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-bg"
                >
                  + Add New Project
                </button>
              </div>

              <div className="space-y-6">
                {data.projects.map((proj, idx) => (
                  <div
                    key={proj.id || idx}
                    className="space-y-4 rounded-xl border border-line bg-bg p-5"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <span className="font-mono text-xs font-bold text-accent">
                        Project #{idx + 1}: {proj.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProject(idx)}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        Delete Project
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) =>
                            updateProject(idx, { name: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Category / Kind
                        </label>
                        <input
                          type="text"
                          value={proj.kind}
                          onChange={(e) =>
                            updateProject(idx, { kind: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted">
                          Business Problem
                        </label>
                        <textarea
                          rows={2}
                          value={proj.problem}
                          onChange={(e) =>
                            updateProject(idx, { problem: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted">
                          Engineered Solution
                        </label>
                        <textarea
                          rows={2}
                          value={proj.solution}
                          onChange={(e) =>
                            updateProject(idx, { solution: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted">
                          Architecture Highlight
                        </label>
                        <input
                          type="text"
                          value={proj.architectureHighlight || ""}
                          onChange={(e) =>
                            updateProject(idx, {
                              architectureHighlight: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted">
                          Your Contributions (One bullet point per line)
                        </label>
                        <textarea
                          rows={4}
                          value={proj.contribution.join("\n")}
                          onChange={(e) =>
                            updateProject(idx, {
                              contribution: e.target.value
                                .split("\n")
                                .filter((line) => line.trim() !== ""),
                            })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Outcome
                        </label>
                        <input
                          type="text"
                          value={proj.outcome}
                          onChange={(e) =>
                            updateProject(idx, { outcome: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Tech Stack (Comma separated)
                        </label>
                        <input
                          type="text"
                          value={proj.tech.join(", ")}
                          onChange={(e) =>
                            updateProject(idx, {
                              tech: e.target.value
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean),
                            })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Live Demo URL
                        </label>
                        <input
                          type="text"
                          value={proj.demo}
                          onChange={(e) =>
                            updateProject(idx, { demo: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted">
                          GitHub Source Code URL
                        </label>
                        <input
                          type="text"
                          value={proj.code}
                          onChange={(e) =>
                            updateProject(idx, { code: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EXPERIENCE & EDUCATION */}
          {activeTab === "experience" && (
            <div className="space-y-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">
                      3. Work Experience
                    </h2>
                    <p className="text-xs text-muted">
                      Manage work history and impact bullet points.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addExperience}
                    className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-bg"
                  >
                    + Add Experience
                  </button>
                </div>

                <div className="mt-4 space-y-5">
                  {data.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="space-y-4 rounded-xl border border-line bg-bg p-5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-accent">
                          {exp.role} @ {exp.company}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExperience(idx)}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-muted">
                            Role Title
                          </label>
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) =>
                              updateExperience(idx, { role: e.target.value })
                            }
                            className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-muted">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) =>
                              updateExperience(idx, { company: e.target.value })
                            }
                            className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-muted">
                            Location
                          </label>
                          <input
                            type="text"
                            value={exp.place}
                            onChange={(e) =>
                              updateExperience(idx, { place: e.target.value })
                            }
                            className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-muted">
                            Period (Start – End Date)
                          </label>
                          <input
                            type="text"
                            value={exp.period}
                            onChange={(e) =>
                              updateExperience(idx, { period: e.target.value })
                            }
                            className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-muted">
                            Impact Bullet Points (One per line)
                          </label>
                          <textarea
                            rows={4}
                            value={exp.points.join("\n")}
                            onChange={(e) =>
                              updateExperience(idx, {
                                points: e.target.value
                                  .split("\n")
                                  .filter((l) => l.trim() !== ""),
                              })
                            }
                            className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-muted">
                            Technologies Used (Comma separated)
                          </label>
                          <input
                            type="text"
                            value={(exp.tech || []).join(", ")}
                            onChange={(e) =>
                              updateExperience(idx, {
                                tech: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="border-t border-line pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
                  <h3 className="font-display text-lg font-bold text-ink">
                    Education Credentials
                  </h3>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent"
                  >
                    + Add Education
                  </button>
                </div>

                <div className="space-y-4">
                  {data.education.map((ed, idx) => (
                    <div
                      key={idx}
                      className="grid gap-3 rounded-xl border border-line bg-bg p-4 sm:grid-cols-4"
                    >
                      <input
                        type="text"
                        value={ed.title}
                        onChange={(e) =>
                          updateEducation(idx, { title: e.target.value })
                        }
                        placeholder="Degree"
                        className="rounded border border-line bg-panel px-3 py-1.5 text-xs text-ink"
                      />
                      <input
                        type="text"
                        value={ed.school}
                        onChange={(e) =>
                          updateEducation(idx, { school: e.target.value })
                        }
                        placeholder="Institution"
                        className="rounded border border-line bg-panel px-3 py-1.5 text-xs text-ink"
                      />
                      <input
                        type="text"
                        value={ed.period}
                        onChange={(e) =>
                          updateEducation(idx, { period: e.target.value })
                        }
                        placeholder="Period"
                        className="rounded border border-line bg-panel px-3 py-1.5 text-xs text-ink"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ed.detail}
                          onChange={(e) =>
                            updateEducation(idx, { detail: e.target.value })
                          }
                          placeholder="CGPA / Percentage"
                          className="w-full rounded border border-line bg-panel px-3 py-1.5 text-xs text-ink"
                        />
                        <button
                          type="button"
                          onClick={() => removeEducation(idx)}
                          className="text-xs font-semibold text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICAL SKILLS */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">
                    4. Categorized Technical Skills
                  </h2>
                  <p className="text-xs text-muted">
                    Organize skills cleanly by engineering domain.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSkillGroup}
                  className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-bg"
                >
                  + Add Skill Category
                </button>
              </div>

              <div className="space-y-4">
                {data.skills.map((sk, idx) => (
                  <div
                    key={idx}
                    className="space-y-3 rounded-xl border border-line bg-bg p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent">
                        Category #{idx + 1}: {sk.group}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSkillGroup(idx)}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Category Title
                        </label>
                        <input
                          type="text"
                          value={sk.group}
                          onChange={(e) =>
                            updateSkillGroup(idx, { group: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted">
                          Description
                        </label>
                        <input
                          type="text"
                          value={sk.description || ""}
                          onChange={(e) =>
                            updateSkillGroup(idx, {
                              description: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted">
                          Skills List (Comma separated)
                        </label>
                        <input
                          type="text"
                          value={sk.items.join(", ")}
                          onChange={(e) =>
                            updateSkillGroup(idx, {
                              items: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM ARCHITECTURE */}
          {activeTab === "architecture" && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <h2 className="font-display text-xl font-bold text-ink">
                  5. System Architecture & Engineering Standards
                </h2>
                <p className="text-xs text-muted">
                  Customize the 4 core architectural pillars displayed on the
                  portfolio.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted">
                    Section Headline
                  </label>
                  <input
                    type="text"
                    value={data.architecture.headline}
                    onChange={(e) =>
                      setData({
                        ...data,
                        architecture: {
                          ...data.architecture,
                          headline: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Section Subtitle
                  </label>
                  <input
                    type="text"
                    value={data.architecture.subheadline}
                    onChange={(e) =>
                      setData({
                        ...data,
                        architecture: {
                          ...data.architecture,
                          subheadline: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {data.architecture.pillars.map((pillar, idx) => (
                  <div
                    key={pillar.id || idx}
                    className="space-y-3 rounded-xl border border-line bg-bg p-4"
                  >
                    <input
                      type="text"
                      value={pillar.badge}
                      onChange={(e) => {
                        const next = [...data.architecture.pillars];
                        next[idx] = { ...next[idx], badge: e.target.value };
                        setData({
                          ...data,
                          architecture: { ...data.architecture, pillars: next },
                        });
                      }}
                      className="w-full rounded border border-line bg-panel px-2.5 py-1 text-xs font-mono text-accent"
                    />
                    <input
                      type="text"
                      value={pillar.title}
                      onChange={(e) => {
                        const next = [...data.architecture.pillars];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setData({
                          ...data,
                          architecture: { ...data.architecture, pillars: next },
                        });
                      }}
                      className="w-full rounded border border-line bg-panel px-2.5 py-1.5 text-sm font-bold text-ink"
                    />
                    <textarea
                      rows={3}
                      value={pillar.description}
                      onChange={(e) => {
                        const next = [...data.architecture.pillars];
                        next[idx] = {
                          ...next[idx],
                          description: e.target.value,
                        };
                        setData({
                          ...data,
                          architecture: { ...data.architecture, pillars: next },
                        });
                      }}
                      className="w-full rounded border border-line bg-panel px-2.5 py-1.5 text-xs text-ink"
                    />
                    <input
                      type="text"
                      value={pillar.tech.join(", ")}
                      onChange={(e) => {
                        const next = [...data.architecture.pillars];
                        next[idx] = {
                          ...next[idx],
                          tech: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        };
                        setData({
                          ...data,
                          architecture: { ...data.architecture, pillars: next },
                        });
                      }}
                      className="w-full rounded border border-line bg-panel px-2.5 py-1 text-xs font-mono text-muted"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: GITHUB REPOSITORIES */}
          {activeTab === "github" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">
                    6. GitHub Repositories
                  </h2>
                  <p className="text-xs text-muted">
                    Manage public repository cards displayed on the portfolio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRepo}
                  className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-bg"
                >
                  + Add Repository
                </button>
              </div>

              <div className="space-y-4">
                {data.githubRepos.map((repo, idx) => (
                  <div
                    key={idx}
                    className="space-y-3 rounded-xl border border-line bg-bg p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent">
                        {repo.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRepo(idx)}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-muted">
                          Repository Name
                        </label>
                        <input
                          type="text"
                          value={repo.name}
                          onChange={(e) =>
                            updateRepo(idx, {
                              name: e.target.value,
                              fullName: `apsara-dev/${e.target.value}`,
                            })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-1.5 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted">
                          Languages / Stack
                        </label>
                        <input
                          type="text"
                          value={repo.language}
                          onChange={(e) =>
                            updateRepo(idx, { language: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-1.5 text-sm text-ink"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs text-muted">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={repo.description}
                          onChange={(e) =>
                            updateRepo(idx, { description: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-1.5 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted">
                          GitHub URL
                        </label>
                        <input
                          type="text"
                          value={repo.Url}
                          onChange={(e) =>
                            updateRepo(idx, { Url: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-1.5 text-sm text-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted">
                          Live Demo URL (Optional)
                        </label>
                        <input
                          type="text"
                          value={repo.demoUrl || ""}
                          onChange={(e) =>
                            updateRepo(idx, { demoUrl: e.target.value })
                          }
                          className="mt-1 w-full rounded border border-line bg-panel px-3 py-1.5 text-sm text-ink"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CONTACT INBOX */}
          {activeTab === "messages" && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold text-ink">
                    7. Contact Form Inbox ({messages.length})
                  </h2>
                  <span className="rounded-full border border-line bg-bg px-3 py-0.5 font-mono text-[11px] text-muted">
                    Auto-Cleanup: 60-Day Retention
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Messages submitted by recruiters and visitors on the portfolio
                  contact form. Records older than 60 days are automatically
                  deleted from Supabase, SQLite, and JSON.
                </p>
              </div>

              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  No contact messages received yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-line bg-bg p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                        <div>
                          <h3 className="font-display text-base font-bold text-ink">
                            {m.name}{" "}
                            <a
                              href={`mailto:${m.email}`}
                              className="font-mono text-xs font-normal text-accent hover:underline"
                            >
                              ({m.email})
                            </a>
                          </h3>
                          <p className="font-mono text-[11px] text-muted">
                            {m.created_at
                              ? new Date(m.created_at).toLocaleString()
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(m.id)}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                        {m.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PHONE VIEWS LOG */}
          {activeTab === "phone_views" && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold text-ink">
                    Phone Number Viewers Log ({phoneLogs.length})
                  </h2>
                  <span className="rounded-full border border-line bg-bg px-3 py-0.5 font-mono text-[11px] text-muted">
                    Auto-Cleanup: 60-Day Retention
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Every visitor or recruiter who unlocked and viewed your phone
                  number via Email OTP is logged here. Logs older than 60 days
                  are automatically deleted from Supabase, SQLite, and JSON.
                </p>
              </div>

              {phoneLogs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  No one has unlocked your phone number yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {phoneLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-line bg-bg p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                        <div>
                          <h3 className="font-display text-base font-bold text-ink">
                            {log.viewer_name}
                            {log.company ? (
                              <span className="ml-2 font-sans text-xs font-medium text-muted">
                                • {log.company}
                              </span>
                            ) : null}
                          </h3>
                          <a
                            href={`mailto:${log.viewer_email}`}
                            className="font-mono text-xs text-accent hover:underline"
                          >
                            {log.viewer_email}
                          </a>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-muted">
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoneLog(log.id)}
                            className="text-xs font-semibold text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 font-mono text-xs text-muted sm:grid-cols-2">
                        <div>
                          <span className="font-semibold text-ink">IP:</span>{" "}
                          {log.ip_address}
                        </div>
                        <div className="truncate" title={log.user_agent}>
                          <span className="font-semibold text-ink">
                            Device/Browser:
                          </span>{" "}
                          {log.user_agent}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: EMAIL (PRIMARY INBOX - ZERO SPAM) */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold text-ink">
                    8. Free Primary Inbox Email Service (No Custom Domain Needed)
                  </h2>
                  <span
                    className={`rounded-full px-3 py-0.5 font-mono text-xs font-semibold ${
                      emailConfig.hasAppPassword
                        ? "bg-accent/15 text-accent"
                        : "bg-panel text-muted"
                    }`}
                  >
                    {emailConfig.hasAppPassword
                      ? "● Active (Gmail SMTP Primary Inbox)"
                      : "○ App Password Required"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Uses your own Gmail account&apos;s official Google SMTP server
                  (SPF + DKIM + DMARC verified) so every Contact Form message
                  lands 100% in your <strong>Primary Inbox</strong>—never in the
                  Spam folder!
                </p>
              </div>

              {/* 30-Second Setup Guide */}
              <div className="rounded-xl border border-line bg-bg p-5 text-xs leading-relaxed">
                <h3 className="font-display text-sm font-bold text-ink">
                  How to get your free 16-digit Google App Password (30 seconds):
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
                  <li>
                    Open your{" "}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-accent underline"
                    >
                      Google Account App Passwords Page ↗
                    </a>{" "}
                    (Make sure 2-Step Verification is turned ON).
                  </li>
                  <li>
                    Type <strong className="text-ink">Portfolio</strong> as the
                    App Name and click <strong className="text-ink">Create</strong>.
                  </li>
                  <li>
                    Copy the <strong className="text-ink">16-letter code</strong>{" "}
                    shown by Google and paste it below.
                  </li>
                </ol>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted">
                    Your Gmail Address (Sender & SMTP Auth)
                  </label>
                  <input
                    type="email"
                    value={emailConfig.gmailUser}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        gmailUser: e.target.value,
                      })
                    }
                    placeholder="apsarababu77@gmail.com"
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    16-Digit Google App Password
                  </label>
                  <input
                    type="password"
                    value={emailConfig.gmailAppPassword}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        gmailAppPassword: e.target.value,
                      })
                    }
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 font-mono text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted">
                    Receive Inquiries At (Primary Inbox Email)
                  </label>
                  <input
                    type="email"
                    value={emailConfig.recipientEmail}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        recipientEmail: e.target.value,
                      })
                    }
                    placeholder="apsarababu77@gmail.com"
                    className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={emailConfig.enableAutoReply}
                      onChange={(e) =>
                        setEmailConfig({
                          ...emailConfig,
                          enableAutoReply: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-teal-600"
                    />
                    <span>
                      Send automatic confirmation reply to recruiters who
                      message you
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  disabled={testingEmail}
                  onClick={() => handleSaveEmailSettings(false)}
                  className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50"
                >
                  {testingEmail ? "Processing..." : "Save Email Settings"}
                </button>

                <button
                  type="button"
                  disabled={testingEmail}
                  onClick={() => handleSaveEmailSettings(true)}
                  className="rounded-md border border-line bg-bg px-4 py-2 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50"
                >
                  {testingEmail
                    ? "Sending Test Email..."
                    : "Save & Send Test Email to Primary Inbox"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: DB ⇄ JSON SYNC & SUPABASE CLOUD DB */}
          {activeTab === "sync" && (
            <div className="space-y-6">
              <div className="border-b border-line pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold text-ink">
                    Supabase Cloud DB ⇄ Local SQLite (portfolio.db) ⇄ JSON Sync
                  </h2>
                  <span
                    className={`rounded-full px-3 py-0.5 font-mono text-xs font-semibold ${
                      supabaseConfig.configured
                        ? "bg-accent/15 text-accent"
                        : "bg-panel text-muted"
                    }`}
                  >
                    {supabaseConfig.configured
                      ? `● Supabase Connected (${supabaseConfig.mode})`
                      : "○ Local SQLite + JSON Active"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Connect your free Supabase PostgreSQL database so live edits
                  on Vercel (<code>apsara-r-portfolio.vercel.app/admin</code>)
                  persist permanently in the cloud while staying in sync with
                  local SQLite and <code>data/portfolio.json</code>.
                </p>
              </div>

              {/* Supabase Connection Box */}
              <div className="space-y-4 rounded-xl border border-line bg-bg p-5">
                <h3 className="font-display text-sm font-bold text-ink">
                  Connect Supabase Cloud Database (Choose Option A or Option B)
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted">
                      Option A (Recommended — Auto-Creates All Tables): Supabase
                      PostgreSQL URI (<code>DATABASE_URL</code>)
                    </label>
                    <input
                      type="password"
                      value={supabaseConfig.databaseUrl}
                      onChange={(e) =>
                        setSupabaseConfig({
                          ...supabaseConfig,
                          databaseUrl: e.target.value,
                        })
                      }
                      placeholder="postgresql://postgres.[project-ref]:[password]@aws-0-...pooler.supabase.com:6543/postgres"
                      className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 font-mono text-xs text-ink"
                    />
                  </div>

                  <div className="grid gap-3 pt-1 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-muted">
                        Option B: Supabase Project URL (
                        <code>SUPABASE_URL</code>)
                      </label>
                      <input
                        type="text"
                        value={supabaseConfig.supabaseUrl}
                        onChange={(e) =>
                          setSupabaseConfig({
                            ...supabaseConfig,
                            supabaseUrl: e.target.value,
                          })
                        }
                        placeholder="https://xyzcompany.supabase.co"
                        className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 font-mono text-xs text-ink"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted">
                        Option B: Supabase Service Role / Anon Key (
                        <code>SUPABASE_SERVICE_ROLE_KEY</code>)
                      </label>
                      <input
                        type="password"
                        value={supabaseConfig.supabaseKey}
                        onChange={(e) =>
                          setSupabaseConfig({
                            ...supabaseConfig,
                            supabaseKey: e.target.value,
                          })
                        }
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 font-mono text-xs text-ink"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={syncingSupabase}
                    onClick={async () => {
                      setSyncingSupabase(true);
                      try {
                        const res = await fetch("/api/admin/supabase", {
                          method: "POST",
                          headers: getAuthHeaders(),
                          body: JSON.stringify({
                            action: "push-to-supabase",
                            databaseUrl: supabaseConfig.databaseUrl,
                            supabaseUrl: supabaseConfig.supabaseUrl,
                            supabaseKey: supabaseConfig.supabaseKey,
                          }),
                        });
                        const json = await res.json();
                        if (!res.ok)
                          throw new Error(
                            json.error || "Supabase connection failed"
                          );
                        showToast(json.message);
                        fetchAllAdminData();
                      } catch (err: any) {
                        showToast(err?.message || "Failed", "error");
                      } finally {
                        setSyncingSupabase(false);
                      }
                    }}
                    className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50"
                  >
                    {syncingSupabase
                      ? "Connecting & Syncing..."
                      : "Save & Push Portfolio to Supabase Cloud"}
                  </button>

                  <button
                    type="button"
                    disabled={syncingSupabase}
                    onClick={async () => {
                      setSyncingSupabase(true);
                      try {
                        const res = await fetch("/api/admin/supabase", {
                          method: "POST",
                          headers: getAuthHeaders(),
                          body: JSON.stringify({
                            action: "pull-from-supabase",
                          }),
                        });
                        const json = await res.json();
                        if (!res.ok)
                          throw new Error(json.error || "Pull failed");
                        if (json.data) {
                          setData(json.data);
                          setRawJsonText(JSON.stringify(json.data, null, 2));
                        }
                        showToast(json.message);
                      } catch (err: any) {
                        showToast(err?.message || "Failed", "error");
                      } finally {
                        setSyncingSupabase(false);
                      }
                    }}
                    className="rounded-md border border-line bg-panel px-4 py-2 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50"
                  >
                    Pull Latest from Supabase → Local DB & JSON
                  </button>
                </div>
              </div>

              {/* Local SQLite <-> JSON Sync Controls */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg p-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleForceSync("json-to-db")}
                  className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50"
                >
                  Sync data/portfolio.json → SQLite DB
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleForceSync("db-to-json")}
                  className="rounded-md border border-line bg-panel px-4 py-2 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50"
                >
                  Export SQLite DB → data/portfolio.json
                </button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-mono text-xs font-semibold text-muted">
                    Raw data/portfolio.json Editor
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(rawJsonText);
                        handleSavePortfolio(parsed);
                      } catch {
                        showToast("Invalid JSON syntax", "error");
                      }
                    }}
                    className="rounded bg-accent px-3 py-1 text-xs font-semibold text-bg"
                  >
                    Apply & Save Raw JSON
                  </button>
                </div>
                <textarea
                  rows={18}
                  value={rawJsonText}
                  onChange={(e) => setRawJsonText(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg p-4 font-mono text-xs leading-relaxed text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
