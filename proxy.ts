import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "access";

export function proxy(request: NextRequest) {
  const code = process.env.ACCESS_CODE;
  if (!code) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const url = request.nextUrl.clone();

  const given = url.searchParams.get("code");

  if (given !== null) {
    url.searchParams.delete("code");
    const res = NextResponse.redirect(url);
    if (given === code) {
      res.cookies.set(COOKIE, given, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  }

  if (request.cookies.get(COOKIE)?.value === code) {
    return NextResponse.next();
  }

  if (url.pathname.startsWith("/api/")) {
    return Response.json(
      {
        statusText: "Unauthorized",
        message: "Access code required.",
      },
      { status: 401 },
    );
  }

  return NextResponse.rewrite(new URL("/locked", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
