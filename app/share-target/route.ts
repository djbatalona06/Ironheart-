import { NextResponse, type NextRequest } from "next/server";

// Fallback only. The service worker normally answers this POST on the device (public/sw.js),
// so shared content never reaches the server. When no worker is in control there is nowhere
// local to keep it: the body is not read or stored, and Nutrition explains what to do.
export function POST(request: NextRequest) {
  return NextResponse.redirect(new URL("/nutrition?shared=unavailable", request.url), 303);
}
