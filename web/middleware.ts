import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/crypto")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = NextResponse.next();

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    return response;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const xff =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";
    const ip = xff ? xff.split(",")[0].trim() : "unknown";

    console.log(`API request from IP: ${ip} to ${request.nextUrl.pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
