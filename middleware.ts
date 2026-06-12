export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protect everything except the login page, auth endpoints, and static assets.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
