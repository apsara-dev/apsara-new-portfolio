"use client";

import { useState } from "react";
import Section from "./Section";
import type { ProfileData } from "@/data/portfolio";

export default function Contact({
  profile,
  isOtpVerified,
  unlockedPhone,
  onOpenOtpModal,
  onLockPhone,
  onOpenResume,
  onMessageSaved,
}: {
  profile: ProfileData;
  isOtpVerified: boolean;
  unlockedPhone: string;
  onOpenOtpModal: () => void;
  onLockPhone?: () => void;
  onOpenResume: () => void;
  onMessageSaved?: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const maskedPhone = "+91 90376 •••••";
  const displayPhone =
    isOtpVerified && unlockedPhone && !unlockedPhone.includes("•")
      ? unlockedPhone
      : maskedPhone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not send message.");
      }

      setFeedback({
        type: "success",
        text: "Thank you. Your message has been received.",
      });
      setForm({ name: "", email: "", subject: "", message: "" });
      if (onMessageSaved) onMessageSaved();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to send message.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section
      id="contact"
      title="Contact"
      subtitle="Available for full-time Python and Full-Stack Software Engineering roles."
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <dl className="divide-y divide-line text-sm">
            <div className="grid grid-cols-[6.5rem_1fr] py-3 first:pt-0">
              <dt className="text-muted">Email</dt>
              <dd>
                <a
                  href={`mailto:${profile.email}`}
                  className="font-medium text-accent underline-offset-4 hover:underline"
                >
                  {profile.email}
                </a>
              </dd>
            </div>

            <div className="grid grid-cols-[6.5rem_1fr] items-center py-3">
              <dt className="text-muted">Phone</dt>
              <dd className="flex flex-wrap items-center gap-3">
                {isOtpVerified && !displayPhone.includes("•") ? (
                  <>
                    <a
                      href={`tel:${displayPhone.replace(/\s/g, "")}`}
                      className="font-mono font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {displayPhone}
                    </a>
                    {onLockPhone && (
                      <button
                        type="button"
                        onClick={onLockPhone}
                        className="rounded border border-line bg-panel px-2 py-0.5 text-[11px] font-medium text-muted hover:text-ink"
                      >
                        Hide Number
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-mono text-muted">{maskedPhone}</span>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={onOpenOtpModal}
                      className="rounded border border-line bg-panel px-2.5 py-0.5 text-xs font-medium text-ink hover:border-accent"
                    >
                      Verify OTP to View
                    </button>
                  </>
                )}
              </dd>
            </div>

            <div className="grid grid-cols-[6.5rem_1fr] py-3">
              <dt className="text-muted">LinkedIn</dt>
              <dd>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent underline-offset-4 hover:underline"
                >
                  linkedin.com/in/apsara-rb59794280 ↗
                </a>
              </dd>
            </div>

            {profile.github && (
              <div className="grid grid-cols-[6.5rem_1fr] py-3">
                <dt className="text-muted">GitHub</dt>
                <dd>
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    {profile.github.replace("https://", "")} ↗
                  </a>
                </dd>
              </div>
            )}

            <div className="grid grid-cols-[6.5rem_1fr] py-3">
              <dt className="text-muted">Location</dt>
              <dd className="text-ink">{profile.location}</dd>
            </div>

            <div className="grid grid-cols-[6.5rem_1fr] items-center py-3 last:pb-0">
              <dt className="text-muted">Resume</dt>
              <dd className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenResume}
                  className="font-medium text-accent underline-offset-4 hover:underline"
                >
                  View Resume
                </button>
                <span className="text-muted">•</span>
                {isOtpVerified ? (
                  <a
                    href={profile.resume}
                    download
                    className="font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
                  >
                    Download Full PDF ↗
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenOtpModal}
                    className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    Unlock Full PDF via OTP
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-panel/40 p-6"
        >
          <h3 className="font-display text-base font-semibold text-ink">
            Send a Message
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted">
                Name
              </label>
              <input
                type="text"
                required
                suppressHydrationWarning
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted">
                Email
              </label>
              <input
                type="email"
                required
                suppressHydrationWarning
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-muted">
              Message
            </label>
            <textarea
              rows={3}
              required
              suppressHydrationWarning
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>

          {feedback && (
            <p
              className={`mt-3 text-xs font-medium ${
                feedback.type === "success" ? "text-accent" : "text-red-500"
              }`}
            >
              {feedback.text}
            </p>
          )}

          <div className="mt-4">
            <button
              type="submit"
              suppressHydrationWarning
              disabled={submitting}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </Section>
  );
}
