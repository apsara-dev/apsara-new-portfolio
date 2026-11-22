import { NextResponse } from "next/server";
import {
  getPhoneAccessLogs,
  savePhoneAccessLog,
  deletePhoneAccessLog,
  getSyncedPortfolioData,
  createEmailOtp,
  verifyEmailOtp,
} from "@/lib/db";
import {
  deletePhoneLogFromSupabase,
  isSupabaseConfigured,
  pullPhoneLogsFromSupabase,
} from "@/lib/supabase";
import {
  sendPhoneViewAlertEmail,
  sendVerificationOtpEmail,
} from "@/lib/mailer";
import {
  checkRateLimit,
  clearOtpFailures,
  createSignedToken,
  createStatelessOtpChallenge,
  getClientIp,
  isValidEmail,
  recordOtpFailure,
  sanitizeHeaderField,
  verifyAdminRequest,
  verifyStatelessOtpChallenge,
} from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    if (isSupabaseConfigured().configured) {
      const cloudLogs = await pullPhoneLogsFromSupabase();
      if (cloudLogs && cloudLogs.length > 0) {
        return NextResponse.json({ logs: cloudLogs }, { status: 200 });
      }
    }

    const logs = getPhoneAccessLogs();
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not load phone access logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const {
      action,
      viewer_name,
      viewer_email,
      company,
      otp_code,
      challenge_token,
    } = body || {};

    // STEP 1: Generate & Send 6-Digit Email OTP
    if (action === "send-otp") {
      const limit = checkRateLimit(`send-otp:${ip}`, 6, 10 * 60 * 1000);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: `Too many OTP requests. Please wait ${limit.retryAfterSec} seconds.`,
          },
          { status: 429 }
        );
      }

      if (!viewer_name?.trim() || !viewer_email?.trim()) {
        return NextResponse.json(
          { error: "Name and a valid email address are required." },
          { status: 400 }
        );
      }

      if (!isValidEmail(viewer_email)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      const safeName = sanitizeHeaderField(viewer_name, 100);
      const safeEmail = sanitizeHeaderField(viewer_email, 150);
      const safeCompany = sanitizeHeaderField(company || "", 100);

      clearOtpFailures(safeEmail);

      const otp = createEmailOtp({
        viewer_name: safeName,
        viewer_email: safeEmail,
        company: safeCompany,
      });

      const challengeToken = createStatelessOtpChallenge({
        email: safeEmail,
        otp,
        name: safeName,
        company: safeCompany,
      });

      const mailRes = await sendVerificationOtpEmail({
        toEmail: safeEmail,
        viewerName: safeName,
        otpCode: otp,
      });

      if (!mailRes.sent) {
        return NextResponse.json(
          {
            error:
              mailRes.reason ||
              "Could not send OTP email. Please check the email address.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          status: "otp_sent",
          challengeToken,
          message: `A 6-digit verification code has been sent to ${safeEmail}.`,
        },
        { status: 200 }
      );
    }

    // STEP 2: Verify 6-Digit Email OTP & Unlock Phone + Full Resume
    if (action === "verify-otp") {
      const limit = checkRateLimit(`verify-otp:${ip}`, 10, 10 * 60 * 1000);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: `Too many verification attempts. Please wait ${limit.retryAfterSec} seconds.`,
          },
          { status: 429 }
        );
      }

      if (!viewer_email?.trim() || !otp_code?.trim()) {
        return NextResponse.json(
          { error: "Email and 6-digit OTP code are required." },
          { status: 400 }
        );
      }

      const dbVerification = verifyEmailOtp(viewer_email, otp_code);
      const statelessVerification = verifyStatelessOtpChallenge(
        challenge_token,
        viewer_email,
        otp_code
      );
      const verification = dbVerification.valid
        ? dbVerification
        : statelessVerification.valid
          ? statelessVerification
          : dbVerification;
      if (!verification.valid) {
        const failState = recordOtpFailure(viewer_email);
        if (failState.lockedOut) {
          return NextResponse.json(
            {
              error:
                "Too many incorrect OTP guesses. Please request a new 6-digit OTP.",
            },
            { status: 429 }
          );
        }
        return NextResponse.json(
          {
            error: `${verification.reason || "Invalid OTP code."} (${failState.attemptsLeft} attempts remaining)`,
          },
          { status: 400 }
        );
      }

      clearOtpFailures(viewer_email);

      const userAgent = sanitizeHeaderField(
        request.headers.get("user-agent") || "Web Browser",
        250
      );

      const result = savePhoneAccessLog({
        viewer_name: sanitizeHeaderField(
          verification.viewer_name || viewer_name || "Verified Viewer",
          100
        ),
        viewer_email: sanitizeHeaderField(viewer_email, 150),
        company: sanitizeHeaderField(
          verification.company || company || "OTP Verified",
          100
        ),
        ip_address: ip,
        user_agent: userAgent,
      });

      sendPhoneViewAlertEmail(result.saved).catch((err) => {
        console.warn("Phone view email alert warning:", err);
      });

      const portfolio = getSyncedPortfolioData();
      const otpVerifiedToken = createSignedToken(
        "otp_verified",
        viewer_email.trim().toLowerCase(),
        4 * 60 * 60 * 1000
      );

      return NextResponse.json(
        {
          status: "verified",
          phone: portfolio.profile.phone,
          resumeUrl: `/api/resume?token=${encodeURIComponent(otpVerifiedToken)}`,
          otpToken: otpVerifiedToken,
          record: result.saved,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action. Expected 'send-otp' or 'verify-otp'." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Verification request failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json(
        { error: "Log ID is required" },
        { status: 400 }
      );
    }
    if (isSupabaseConfigured().configured) {
      await deletePhoneLogFromSupabase(id);
    }
    const logs = deletePhoneAccessLog(id);
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete log" },
      { status: 500 }
    );
  }
}
