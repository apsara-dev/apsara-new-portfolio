import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import type { ContactSubmission, PhoneAccessLog } from "./db";
import { escapeHtml, sanitizeHeaderField } from "./security";

const DATA_DIR = path.join(process.cwd(), "data");
const EMAIL_CONFIG_PATH = path.join(DATA_DIR, "email_config.json");

export interface EmailConfig {
  gmailUser: string;
  gmailAppPassword: string;
  recipientEmail: string;
  enableAutoReply: boolean;
}

export function getEmailConfig(): EmailConfig {
  let fileConfig: Partial<EmailConfig> = {};
  try {
    if (fs.existsSync(EMAIL_CONFIG_PATH)) {
      fileConfig = JSON.parse(fs.readFileSync(EMAIL_CONFIG_PATH, "utf-8"));
    }
  } catch {}

  const gmailUser =
    fileConfig.gmailUser ||
    process.env.GMAIL_USER ||
    "apsaraappdevelopment@gmail.com";
  const gmailAppPassword =
    fileConfig.gmailAppPassword ||
    process.env.GMAIL_APP_PASSWORD ||
    "vdpatpmxcypykafa";
  const recipientEmail =
    fileConfig.recipientEmail ||
    process.env.RECIPIENT_EMAIL ||
    "apsaraappdevelopment@gmail.com, apsarababu77@gmail.com";
  const enableAutoReply =
    typeof fileConfig.enableAutoReply === "boolean"
      ? fileConfig.enableAutoReply
      : true;

  return {
    gmailUser: gmailUser.trim(),
    gmailAppPassword: gmailAppPassword.replace(/\s+/g, ""),
    recipientEmail: recipientEmail.trim(),
    enableAutoReply,
  };
}

export function saveEmailConfig(input: Partial<EmailConfig>): EmailConfig {
  const current = getEmailConfig();
  const updated: EmailConfig = {
    gmailUser: (input.gmailUser ?? current.gmailUser).trim(),
    gmailAppPassword: (
      input.gmailAppPassword ?? current.gmailAppPassword
    ).replace(/\s+/g, ""),
    recipientEmail: (input.recipientEmail ?? current.recipientEmail).trim(),
    enableAutoReply:
      typeof input.enableAutoReply === "boolean"
        ? input.enableAutoReply
        : current.enableAutoReply,
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    EMAIL_CONFIG_PATH,
    JSON.stringify(updated, null, 2),
    "utf-8"
  );
  return updated;
}

export async function sendPrimaryInboxEmail(
  submission: ContactSubmission
): Promise<{ sent: boolean; reason?: string }> {
  const config = getEmailConfig();

  if (!config.gmailUser || !config.gmailAppPassword) {
    return {
      sent: false,
      reason:
        "Gmail App Password not configured yet. Message saved safely in Admin Inbox.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });

  const safeName = sanitizeHeaderField(submission.name, 100);
  const safeEmail = sanitizeHeaderField(submission.email, 150);
  const cleanSubject = sanitizeHeaderField(
    submission.subject || `New Portfolio Inquiry from ${safeName}`,
    140
  );

  const plainText = [
    `New message received from your Engineering Portfolio:`,
    ``,
    `Name: ${safeName}`,
    `Email: ${safeEmail}`,
    `Subject: ${cleanSubject}`,
    `Date: ${new Date().toLocaleString()}`,
    ``,
    `Message:`,
    `${submission.message}`,
    ``,
    `---`,
    `Tip: Click "Reply" in Gmail to respond directly to ${safeName} (${safeEmail}).`,
  ].join("\n");

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a; background-color: #ffffff;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #0f766e;">
        Portfolio Direct Inquiry
      </p>
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a;">
        ${escapeHtml(cleanSubject)}
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 100px;">From:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${escapeHtml(safeName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Reply Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(safeEmail)}" style="color: #0f766e; text-decoration: none; font-weight: 600;">${escapeHtml(safeEmail)}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Received:</td>
          <td style="padding: 8px 0; color: #334155;">${escapeHtml(new Date().toLocaleString())}</td>
        </tr>
      </table>
      <div style="padding: 16px; background-color: #f8fafc; border-left: 3px solid #0f766e; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${escapeHtml(submission.message)}</div>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748b;">
        Simply click <strong>Reply</strong> in Gmail to answer ${escapeHtml(safeName)} directly.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Apsara R Portfolio" <${config.gmailUser}>`,
    to: config.recipientEmail,
    replyTo: `"${safeName.replace(/"/g, "")}" <${safeEmail}>`,
    subject: `[Portfolio] ${cleanSubject} — ${safeName}`,
    text: plainText,
    html: htmlBody,
    headers: {
      "X-Priority": "1 (Highest)",
      Importance: "High",
    },
  });

  if (
    config.enableAutoReply &&
    safeEmail &&
    safeEmail.toLowerCase() !== config.gmailUser.toLowerCase()
  ) {
    try {
      await transporter.sendMail({
        from: `"Apsara R" <${config.gmailUser}>`,
        to: safeEmail,
        subject: `Thank you for reaching out — Apsara R`,
        text: `Hi ${safeName},\n\nThank you for contacting me through my portfolio. I have received your message regarding "${cleanSubject}" and will get back to you shortly.\n\nBest regards,\nApsara R\nSoftware Engineer — Python Full Stack\nLinkedIn: https://www.linkedin.com/in/apsara-rb59794280\nGitHub: https://github.com/apsara-dev`,
      });
    } catch {}
  }

  return { sent: true };
}

export async function sendPhoneViewAlertEmail(
  log: PhoneAccessLog
): Promise<{ sent: boolean }> {
  const config = getEmailConfig();
  if (!config.gmailUser || !config.gmailAppPassword) {
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });

  const safeName = sanitizeHeaderField(log.viewer_name, 100);
  const safeCompany = sanitizeHeaderField(log.company || "", 100);
  const safeEmail = sanitizeHeaderField(log.viewer_email, 150);

  const subject = `[Portfolio Alert] Phone & Resume Unlocked via OTP by ${safeName}${
    safeCompany ? ` (${safeCompany})` : ""
  }`;

  const text = [
    `A verified visitor just unlocked your phone number & full resume via 6-digit Email OTP:`,
    ``,
    `Viewer Name: ${safeName}`,
    `Company / Role: ${safeCompany || "Not specified"}`,
    `Verified Email: ${safeEmail}`,
    `IP Address: ${log.ip_address}`,
    `Device / Browser: ${log.user_agent}`,
    `Time: ${new Date().toLocaleString()}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a; background-color: #ffffff;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #0f766e;">
        OTP Verified Phone &amp; Resume Unlock Alert
      </p>
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #0f172a;">
        ${escapeHtml(safeName)} verified via Email OTP
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 130px;">Name:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${escapeHtml(safeName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Company / Role:</td>
          <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(safeCompany || "—")}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Verified Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(safeEmail)}" style="color: #0f766e; font-weight: 600; text-decoration: none;">${escapeHtml(safeEmail)}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">IP Address:</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 12px; color: #334155;">${escapeHtml(log.ip_address || "")}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Browser / Device:</td>
          <td style="padding: 8px 0; font-size: 12px; color: #475569;">${escapeHtml(log.user_agent || "")}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Timestamp:</td>
          <td style="padding: 8px 0; color: #334155;">${escapeHtml(new Date().toLocaleString())}</td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: `"Apsara R Portfolio" <${config.gmailUser}>`,
    to: config.recipientEmail,
    replyTo: `"${safeName.replace(/"/g, "")}" <${safeEmail}>`,
    subject,
    text,
    html,
  });

  return { sent: true };
}

export async function sendVerificationOtpEmail(params: {
  toEmail: string;
  viewerName: string;
  otpCode: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const config = getEmailConfig();
  if (!config.gmailUser || !config.gmailAppPassword) {
    return {
      sent: false,
      reason: "Email service is not configured on the server.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });

  const safeName = sanitizeHeaderField(params.viewerName, 100);
  const safeEmail = sanitizeHeaderField(params.toEmail, 150);
  const safeOtp = sanitizeHeaderField(params.otpCode, 10);

  const subject = `${safeOtp} is your verification code — Apsara R Portfolio`;

  const text = [
    `Hello ${safeName},`,
    ``,
    `Your 6-digit verification code to unlock Apsara R's direct phone number and full technical resume is:`,
    ``,
    `${safeOtp}`,
    ``,
    `This code is valid for 10 minutes.`,
    ``,
    `Best regards,`,
    `Apsara R — Software Engineer (Python Full Stack)`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 10px; color: #0f172a; background-color: #ffffff;">
      <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #0f766e;">
        Apsara R • Engineering Portfolio
      </p>
      <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #0f172a;">
        Verify your email to unlock contact details
      </h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
        Hello <strong>${escapeHtml(safeName)}</strong>, use the 6-digit verification code below to unlock direct phone contact and the full PDF technical resume:
      </p>
      <div style="margin: 0 0 20px 0; padding: 16px; text-align: center; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.25em; color: #0f766e;">
        ${escapeHtml(safeOtp)}
      </div>
      <p style="margin: 0; font-size: 12px; color: #64748b;">
        This code expires in 10 minutes.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Apsara R Portfolio" <${config.gmailUser}>`,
    to: safeEmail,
    subject,
    text,
    html,
  });

  return { sent: true };
}
