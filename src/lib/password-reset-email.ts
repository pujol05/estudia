import "server-only";

import { after } from "next/server";

import { sendEmail } from "@/lib/email";

type Locale = "ca" | "es" | "en";

const copy: Record<Locale, { subject: string; introduction: string; expiry: string }> = {
  ca: {
    subject: "Restableix la contrasenya d’Estudia",
    introduction: "Hem rebut una sol·licitud per restablir la contrasenya del teu compte d’Estudia.",
    expiry: "L’enllaç caduca d’aquí a una hora. Si no ho has demanat, pots ignorar aquest missatge.",
  },
  es: {
    subject: "Restablece la contraseña de Estudia",
    introduction: "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Estudia.",
    expiry: "El enlace caduca dentro de una hora. Si no lo has solicitado, puedes ignorar este mensaje.",
  },
  en: {
    subject: "Reset your Estudia password",
    introduction: "We received a request to reset the password for your Estudia account.",
    expiry: "The link expires in one hour. If you did not request it, you can ignore this message.",
  },
};

function getRequestLocale(request: Request | undefined): Locale {
  const referer = request?.headers.get("referer");

  if (!referer) {
    return "ca";
  }

  try {
    const locale = new URL(referer).pathname.split("/")[1];
    return locale === "es" || locale === "en" ? locale : "ca";
  } catch {
    return "ca";
  }
}

export function queuePasswordResetEmail({
  email,
  url,
  request,
}: {
  email: string;
  url: string;
  request?: Request;
}) {
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL;
  const locale = getRequestLocale(request);
  const message = copy[locale];

  if (!from) {
    console.error("AUTH_FROM_EMAIL or CONTACT_FROM_EMAIL is not configured");
    return;
  }

  after(async () => {
    try {
      await sendEmail({
        from,
        to: email,
        subject: message.subject,
        text: [
          message.introduction,
          "",
          url,
          "",
          message.expiry,
        ].join("\n"),
      });
    } catch (error) {
      console.error("Password reset email could not be sent", error);
    }
  });
}
