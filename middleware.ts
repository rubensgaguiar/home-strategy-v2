import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/";
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/home");
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  if (isAuthRoute) return NextResponse.next();
  if (isLoginPage && isLoggedIn) return NextResponse.redirect(new URL("/home", req.url));
  if (isProtectedRoute && !isLoggedIn) return NextResponse.redirect(new URL("/", req.url));

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
