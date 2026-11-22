import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createSignedToken,
  getClientIp,
  timingSafeCompare,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${limit.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();
    const validUser = process.env.ADMIN_USERNAME || "admin";
    const validPass = process.env.ADMIN_PASSWORD || "admin@123";

    const userMatch = timingSafeCompare(String(username || ""), validUser);
    const passMatch = timingSafeCompare(String(password || ""), validPass);

    if (userMatch && passMatch) {
      const signedToken = createSignedToken(
        "admin",
        validUser,
        12 * 60 * 60 * 1000
      );

      const response = NextResponse.json(
        {
          authenticated: true,
          username: validUser,
          token: signedToken,
        },
        { status: 200 }
      );

      response.cookies.set("apsara_admin_token", signedToken, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 12 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid admin username or password." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "Authentication request failed." },
      { status: 400 }
    );
  }
}
