"use client";

import { useState } from "react";

export default function OtpVerificationModal({
  isOpen,
  onClose,
  onVerified,
  purposeLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (payload: {
    phone: string;
    resumeUrl: string;
    otpToken?: string;
  }) => void;
  purposeLabel?: string;
}) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [challengeToken, setChallengeToken] = useState("");
  const [form, setForm] = useState({
    viewer_name: "",
    company: "",
    viewer_email: "",
    otp_code: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/phone-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-otp",
          viewer_name: form.viewer_name,
          company: form.company,
          viewer_email: form.viewer_email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not send verification code.");
      }

      if (data.challengeToken) {
        setChallengeToken(data.challengeToken);
      }
      setInfo(
        data.message ||
          `A 6-digit OTP has been sent to ${form.viewer_email}.`
      );
      setStep("verify");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/phone-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-otp",
          viewer_name: form.viewer_name,
          company: form.company,
          viewer_email: form.viewer_email,
          otp_code: form.otp_code,
          challenge_token: challengeToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP code.");
      }

      onVerified({
        phone: data.phone,
        resumeUrl: data.resumeUrl || "/Apsara_R_Resume.pdf",
        otpToken: data.otpToken,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-line bg-bg p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
              Email OTP Verification
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-ink">
              {purposeLabel || "Unlock Phone Number & Full Resume"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-line bg-panel px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        {step === "request" ? (
          <form onSubmit={handleSendOtp} className="mt-4 space-y-3.5">
            <p className="text-xs leading-relaxed text-muted">
              To protect against automated scrapers, please verify your email
              address with a one-time 6-digit code to view the direct phone
              number and download the unmasked PDF resume.
            </p>

            <div>
              <label className="block text-xs font-medium text-muted">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={form.viewer_name}
                onChange={(e) =>
                  setForm({ ...form, viewer_name: e.target.value })
                }
                placeholder="Recruiter / Hiring Manager"
                className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted">
                Company / Organization (Optional)
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company Name"
                className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted">
                Email Address (OTP will be sent here) *
              </label>
              <input
                type="email"
                required
                value={form.viewer_email}
                onChange={(e) =>
                  setForm({ ...form, viewer_email: e.target.value })
                }
                placeholder="name@company.com"
                className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-line bg-panel px-3.5 py-2 text-xs font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Sending OTP..." : "Send 6-Digit OTP"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
            {info && (
              <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
                {info}
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-muted">
                Enter 6-Digit OTP sent to {form.viewer_email}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={form.otp_code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    otp_code: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="123456"
                className="mt-1.5 w-full rounded border border-line bg-panel px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.35em] text-ink focus:border-accent focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setError("");
                }}
                className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                ← Change Email / Resend
              </button>

              <button
                type="submit"
                disabled={busy || form.otp_code.length < 6}
                className="rounded-md bg-accent px-5 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Verify OTP & Unlock"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
