"use client";

import { useState, useCallback, useEffect } from "react";
import type { PortfolioPayload } from "@/data/portfolio";
import Header from "./Header";
import Hero from "./Hero";
import SystemArchitecture from "./SystemArchitecture";
import Projects from "./Projects";
import Experience from "./Experience";
import Skills from "./Skills";
import GitHubSection from "./GitHubSection";
import Contact from "./Contact";
import ResumeModal from "./ResumeModal";
import OtpVerificationModal from "./OtpVerificationModal";

export default function PortfolioClient({
  initialData,
}: {
  initialData: PortfolioPayload;
}) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<PortfolioPayload>(initialData);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [unlockedPhone, setUnlockedPhone] = useState(initialData.profile.phone);
  const [unlockedResumeUrl, setUnlockedResumeUrl] = useState(
    initialData.profile.resume
  );
  const [pendingPdfDownload, setPendingPdfDownload] = useState(false);

  const handleSilentFetch = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setMounted(true);
    handleSilentFetch();
    const savedVerified = sessionStorage.getItem("apsara_otp_verified");
    const savedPhone = sessionStorage.getItem("apsara_unlocked_phone");
    const savedResumeUrl = sessionStorage.getItem("apsara_unlocked_resume_url");
    const savedOtpToken = sessionStorage.getItem("apsara_otp_token");
    if (
      savedVerified === "true" &&
      savedOtpToken &&
      savedPhone &&
      !savedPhone.includes("•")
    ) {
      setIsOtpVerified(true);
      setUnlockedPhone(savedPhone);
      if (savedResumeUrl) setUnlockedResumeUrl(savedResumeUrl);
    } else {
      sessionStorage.removeItem("apsara_otp_verified");
      sessionStorage.removeItem("apsara_unlocked_phone");
      sessionStorage.removeItem("apsara_unlocked_resume_url");
      sessionStorage.removeItem("apsara_otp_token");
    }
  }, [handleSilentFetch]);

  const handleLockPhone = () => {
    setIsOtpVerified(false);
    setUnlockedPhone("+91 90376 •••••");
    setUnlockedResumeUrl("/Apsara_R_Resume.pdf");
    sessionStorage.removeItem("apsara_otp_verified");
    sessionStorage.removeItem("apsara_unlocked_phone");
    sessionStorage.removeItem("apsara_unlocked_resume_url");
    sessionStorage.removeItem("apsara_otp_token");
  };

  const handleRequestOtpForPdf = () => {
    setPendingPdfDownload(true);
    setIsOtpModalOpen(true);
  };

  const handleRequestOtpGeneral = () => {
    setPendingPdfDownload(false);
    setIsOtpModalOpen(true);
  };

  const handleOtpSuccess = ({
    phone,
    resumeUrl,
    otpToken,
  }: {
    phone: string;
    resumeUrl: string;
    otpToken?: string;
  }) => {
    setIsOtpVerified(true);
    if (phone) setUnlockedPhone(phone);
    if (resumeUrl) setUnlockedResumeUrl(resumeUrl);
    sessionStorage.setItem("apsara_otp_verified", "true");
    if (phone) sessionStorage.setItem("apsara_unlocked_phone", phone);
    if (resumeUrl)
      sessionStorage.setItem("apsara_unlocked_resume_url", resumeUrl);
    if (otpToken) sessionStorage.setItem("apsara_otp_token", otpToken);

    if (pendingPdfDownload && resumeUrl) {
      const link = document.createElement("a");
      link.href = resumeUrl;
      link.download = "Apsara_R_Resume.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPendingPdfDownload(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-bg" />;
  }

  const effectiveProfile = isOtpVerified
    ? {
        ...data.profile,
        phone: unlockedPhone || data.profile.phone,
        resume: unlockedResumeUrl || data.profile.resume,
      }
    : data.profile;

  return (
    <>
      <Header
        profile={effectiveProfile}
        onOpenResume={() => setIsResumeOpen(true)}
      />

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <Hero
          profile={effectiveProfile}
          stackHighlights={data.stackHighlights}
          isOtpVerified={isOtpVerified}
          onOpenResume={() => setIsResumeOpen(true)}
          onRequestOtpDownload={handleRequestOtpForPdf}
        />

        <SystemArchitecture architecture={data.architecture} />

        <Projects projects={data.projects} />

        <Experience
          experience={data.experience}
          education={data.education}
        />

        <Skills skills={data.skills} />

        <GitHubSection
          repos={data.githubRepos}
          profile={effectiveProfile}
          isOtpVerified={isOtpVerified}
          onOpenResume={() => setIsResumeOpen(true)}
          onRequestOtpDownload={handleRequestOtpForPdf}
        />

        <Contact
          profile={effectiveProfile}
          isOtpVerified={isOtpVerified}
          unlockedPhone={unlockedPhone}
          onOpenOtpModal={handleRequestOtpGeneral}
          onLockPhone={handleLockPhone}
          onOpenResume={() => setIsResumeOpen(true)}
          onMessageSaved={handleSilentFetch}
        />
      </main>

      <footer className="mx-auto max-w-5xl border-t border-line px-5 py-10 text-xs text-muted sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} {data.profile.name}.
          </p>
          <button
            type="button"
            onClick={() => setIsResumeOpen(true)}
            className="text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            View Resume
          </button>
        </div>
      </footer>

      <ResumeModal
        isOpen={isResumeOpen}
        onClose={() => setIsResumeOpen(false)}
        data={{ ...data, profile: effectiveProfile }}
        isOtpVerified={isOtpVerified}
        unlockedPhone={unlockedPhone}
        onRequestOtp={handleRequestOtpGeneral}
      />

      <OtpVerificationModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onVerified={handleOtpSuccess}
      />
    </>
  );
}
