import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { verifyAdminRequest, verifySignedToken } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const otpToken = searchParams.get("token");

    const isOtpAuthorized = verifySignedToken(otpToken, "otp_verified").valid;
    const isAdminAuthorized = verifyAdminRequest(request);

    if (!isOtpAuthorized && !isAdminAuthorized) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please verify your email via 6-digit OTP to download the full unmasked PDF resume.",
        },
        { status: 401 }
      );
    }

    const fullPdfPath = path.join(
      process.cwd(),
      "data",
      "Apsara_R_Resume_Full.pdf"
    );
    const fallbackPdfPath = path.join(
      process.cwd(),
      "public",
      "Apsara_R_Resume.pdf"
    );

    const targetPath = fs.existsSync(fullPdfPath)
      ? fullPdfPath
      : fallbackPdfPath;

    const buffer = fs.readFileSync(targetPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Apsara_R_Resume.pdf"',
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not serve resume PDF" },
      { status: 500 }
    );
  }
}
