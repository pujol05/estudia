import { NextRequest } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

type TurnstileVerification = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

function getRequestHostname(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const host = forwardedHost?.split(",")[0]?.trim();

  if (!host) {
    return null;
  }

  try {
    return new URL(`https://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isRateLimited(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");

  if (!clientIp) {
    return false;
  }

  const now = Date.now();
  const entry = rateLimitStore.get(clientIp);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function cleanHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const subject = typeof payload.subject === "string" ? cleanHeaderValue(payload.subject) : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const website = typeof payload.website === "string" ? payload.website.trim() : "";
  const locale = ["ca", "es", "en"].includes(String(payload.locale))
    ? String(payload.locale)
    : "ca";
  const turnstileToken = typeof payload.turnstileToken === "string"
    ? payload.turnstileToken.trim()
    : "";

  // Bots commonly fill hidden fields. Return success without sending anything.
  if (website) {
    return Response.json({ ok: true });
  }

  if (
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    subject.length < 3 ||
    subject.length > 120 ||
    message.length < 10 ||
    message.length > 4000
  ) {
    return Response.json({ error: "invalid_fields" }, { status: 400 });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  if (!turnstileSecret) {
    console.error("Turnstile environment variable is not configured");
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  if (!turnstileToken || turnstileToken.length > 2048) {
    return Response.json({ error: "verification_failed" }, { status: 400 });
  }

  const verificationBody = new FormData();
  verificationBody.set("secret", turnstileSecret);
  verificationBody.set("response", turnstileToken);

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");

  if (clientIp) {
    verificationBody.set("remoteip", clientIp);
  }

  let verification: TurnstileVerification;

  try {
    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: verificationBody,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!verificationResponse.ok) {
      throw new Error(`Turnstile returned ${verificationResponse.status}`);
    }

    verification = await verificationResponse.json() as TurnstileVerification;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  const requestHostname = getRequestHostname(request);
  const hasInvalidHostname = process.env.NODE_ENV === "production" && (
    !requestHostname || verification.hostname?.toLowerCase() !== requestHostname
  );

  if (!verification.success || verification.action !== "contact" || hasInvalidHostname) {
    return Response.json({ error: "verification_failed" }, { status: 400 });
  }

  if (isRateLimited(request)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    console.error("Contact form email environment variables are not configured");
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: `[Estudia] ${subject}`,
      text: [
        "Nou missatge des del formulari de contacte d'Estudia",
        "",
        `Correu de resposta: ${email}`,
        `Idioma: ${locale}`,
        `Assumpte: ${subject}`,
        "",
        message,
      ].join("\n"),
    }),
  });

  if (!emailResponse.ok) {
    console.error("Contact form email provider returned an error", emailResponse.status);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
