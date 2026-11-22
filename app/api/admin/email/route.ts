import { NextResponse } from "next/server";
import {
  getEmailConfig,
  saveEmailConfig,
  sendPrimaryInboxEmail,
} from "@/lib/mailer";
import { verifyAdminRequest } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin authentication required." },
      { status: 401 }
    );
  }

  const cfg = getEmailConfig();
  return NextResponse.json({
    gmailUser: cfg.gmailUser,
    recipientEmail: cfg.recipientEmail,
    enableAutoReply: cfg.enableAutoReply,
    hasAppPassword: Boolean(cfg.gmailAppPassword),
    maskedAppPassword: cfg.gmailAppPassword
      ? "•••• •••• •••• " + cfg.gmailAppPassword.slice(-4)
      : "",
  });
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      gmailUser,
      gmailAppPassword,
      recipientEmail,
      enableAutoReply,
      sendTest,
    } = body || {};

    const current = getEmailConfig();
    const updated = saveEmailConfig({
      gmailUser: gmailUser ?? current.gmailUser,
      gmailAppPassword:
        gmailAppPassword && !gmailAppPassword.includes("•")
          ? gmailAppPassword
          : current.gmailAppPassword,
      recipientEmail: recipientEmail ?? current.recipientEmail,
      enableAutoReply:
        typeof enableAutoReply === "boolean"
          ? enableAutoReply
          : current.enableAutoReply,
    });

    if (sendTest) {
      const testResult = await sendPrimaryInboxEmail({
        name: "Portfolio Email Verification",
        email: updated.gmailUser,
        subject: "Primary Inbox Delivery Test — Apsara R Portfolio",
        message:
          "Congratulations! Your Gmail SMTP App Password is active. Every message sent from your portfolio Contact Form will now arrive directly in your Gmail Primary Inbox (never Spam).",
      });

      if (!testResult.sent) {
        return NextResponse.json(
          { error: testResult.reason || "Could not send test email." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        status: "test_sent",
        message: `Test email delivered straight to ${updated.recipientEmail} Primary Inbox!`,
      });
    }

    return NextResponse.json({
      status: "saved",
      message: "Email configuration saved.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "SMTP Authentication failed. Please check your 16-digit Google App Password.",
      },
      { status: 500 }
    );
  }
}
