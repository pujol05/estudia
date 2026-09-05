import "server-only";

type SendEmailInput = {
  from: string;
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
};

export async function sendEmail({
  from,
  to,
  subject,
  text,
  replyTo,
}: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  // Resend explains refusals in the body (unverified domain, sandbox mode,
  // suppressed recipient...). Without it the logs only show a status code,
  // which is not enough to tell a configuration problem from an outage.
  const payload = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}: ${payload.slice(0, 500)}`);
  }

  return payload.slice(0, 200);
}
