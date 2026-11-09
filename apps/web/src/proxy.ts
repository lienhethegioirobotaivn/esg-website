import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
} from "@/features/locale/constants";
import type { Locale } from "@/features/locale/constants";
import { detectLocale, isCrawler } from "@/features/locale/lib/detect";
import {
  getPathLocale,
  localizePath,
  stripLocalePrefix,
} from "@/features/locale/lib/path";

function withLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}

function redirectTo(url: URL, status: 307 | 308) {
  const response = NextResponse.redirect(url, status);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function proxy(request: NextRequest) {
  const { nextUrl, method } = request;
  const pathname = nextUrl.pathname;
  const isNavigation = method === "GET" || method === "HEAD";
  const pathLocale = getPathLocale(pathname);

  const requested = nextUrl.searchParams.get("lang");
  if (requested !== null && isLocale(requested) && isNavigation) {
    const url = nextUrl.clone();
    url.searchParams.delete("lang");
    url.pathname = localizePath(pathname, requested);
    return withLocaleCookie(redirectTo(url, 307), requested);
  }

  if (pathLocale === DEFAULT_LOCALE && isNavigation) {
    const url = nextUrl.clone();
    url.pathname = stripLocalePrefix(pathname);
    return redirectTo(url, 308);
  }

  if (pathLocale !== null) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(LOCALE_COOKIE)?.value;
  let target: Locale = DEFAULT_LOCALE;
  let isFirstVisit = false;

  if (cookieValue !== undefined && isLocale(cookieValue)) {
    target = cookieValue;
  } else if (!isCrawler(request.headers.get("user-agent"))) {
    isFirstVisit = true;
    target = detectLocale({
      country:
        request.headers.get("x-vercel-ip-country") ??
        request.headers.get("cf-ipcountry"),
      acceptLanguage: request.headers.get("accept-language"),
    });
  }

  let response: NextResponse;
  if (target !== DEFAULT_LOCALE && isNavigation) {
    const url = nextUrl.clone();
    url.pathname = localizePath(pathname, target);
    response = redirectTo(url, 307);
  } else {
    const url = nextUrl.clone();
    const internal = pathname === "/" ? "" : pathname;
    url.pathname = `/${target}${internal}`;
    response = NextResponse.rewrite(url);
  }

  return isFirstVisit ? withLocaleCookie(response, target) : response;
}

export const config = {
  matcher: ["/((?!api|quan-tri|_next|_vercel|.*\\..*).*)"],
};
