import "server-only";

export type TurnstileAction =
  | "contact"
  | "register"
  | "password-reset-request";

type TurnstileVerification = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

type VerificationResult =
  | { success: true }
  | { success: false; reason: "invalid" | "unavailable" };

function getRequestHostname(headers: Headers) {
  const forwardedHost = headers.get("x-forwarded-host") ?? headers.get("host");
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

export async function verifyTurnstileToken({
  token,
  action,
  headers,
}: {
  token: string;
  action: TurnstileAction;
  headers: Headers;
}): Promise<VerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    return { success: false, reason: "unavailable" };
  }

  if (!token || token.length > 2048) {
    return { success: false, reason: "invalid" };
  }

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);

  const forwardedFor = headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() ?? headers.get("x-real-ip");

  if (clientIp) {
    body.set("remoteip", clientIp);
  }

  let verification: TurnstileVerification;

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      throw new Error(`Turnstile returned ${response.status}`);
    }

    verification = await response.json() as TurnstileVerification;
  } catch (error) {
    console.error("Turnstile verification request failed", error);
    return { success: false, reason: "unavailable" };
  }

  const requestHostname = getRequestHostname(headers);
  const hasInvalidHostname = process.env.NODE_ENV === "production" && (
    !requestHostname || verification.hostname?.toLowerCase() !== requestHostname
  );

  if (!verification.success || verification.action !== action || hasInvalidHostname) {
    return { success: false, reason: "invalid" };
  }

  return { success: true };
}
