import { NextResponse, type NextRequest } from "next/server";
import { evaluateRouteAccess } from "@/domain/auth/auth.rules";
import { resolveMiddlewareSession } from "@/infrastructure/supabase/middleware-client";

export async function middleware(request: NextRequest) {
  const { response, isAuthenticated, role } =
    await resolveMiddlewareSession(request);

  const decision = evaluateRouteAccess({
    pathname: request.nextUrl.pathname,
    isAuthenticated,
    role,
  });

  if (!decision.allowed) {
    const redirectUrl = new URL(decision.redirectTo, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
