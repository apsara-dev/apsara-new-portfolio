import { NextResponse } from "next/server";
import {
  getContactMessages,
  saveContactMessage,
  deleteContactMessage,
} from "@/lib/db";
import {
  deleteContactFromSupabase,
  isSupabaseConfigured,
  pullContactsFromSupabase,
} from "@/lib/supabase";
import { sendPrimaryInboxEmail } from "@/lib/mailer";
import {
  checkRateLimit,
  getClientIp,
  isValidEmail,
  sanitizeHeaderField,
  verifyAdminRequest,
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
      const cloudMessages = await pullContactsFromSupabase();
      if (cloudMessages && cloudMessages.length > 0) {
        return NextResponse.json({ messages: cloudMessages }, { status: 200 });
      }
    }

    const messages = getContactMessages();
    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not load contact messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`contact:${ip}`, 6, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${limit.retryAfterSec} seconds before sending another message.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, subject, message } = body || {};

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (String(message).length > 4000) {
      return NextResponse.json(
        { error: "Message is too long (maximum 4000 characters)." },
        { status: 400 }
      );
    }

    const result = saveContactMessage({
      name: sanitizeHeaderField(name, 100),
      email: sanitizeHeaderField(email, 150),
      subject: sanitizeHeaderField(subject || "Portfolio Inquiry", 150),
      message: String(message).trim().slice(0, 4000),
    });

    let emailDelivered = false;
    try {
      const mailRes = await sendPrimaryInboxEmail(result.saved);
      emailDelivered = mailRes.sent;
    } catch (mailErr) {
      console.warn(
        "Email delivery warning (message still saved in DB):",
        mailErr
      );
    }

    return NextResponse.json(
      {
        status: "saved",
        emailDelivered,
        record: result.saved,
        totalMessages: result.totalMessages,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save message" },
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
        { error: "Message ID is required" },
        { status: 400 }
      );
    }
    if (isSupabaseConfigured().configured) {
      await deleteContactFromSupabase(id);
    }
    const messages = deleteContactMessage(id);
    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete message" },
      { status: 500 }
    );
  }
}
