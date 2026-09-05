import "server-only";

import { after } from "next/server";

import { getRequestLocale, type Locale } from "@/lib/email-locale";
import { sendEmail } from "@/lib/email";

const copy: Record<Locale, { subject: string; introduction: string; expiry: string }> = {
  ca: {
    subject: "Verifica el teu correu a Estudia",
    introduction: "Gràcies per crear un compte a Estudia. Verifica el teu correu per activar-lo del tot.",
    expiry: "L’enllaç caduca d’aquí a una hora. Si no has creat aquest compte, pots ignorar aquest missatge.",
  },
  es: {
    subject: "Verifica tu correo en Estudia",
    introduction: "Gracias por crear una cuenta en Estudia. Verifica tu correo para activarla del todo.",
    expiry: "El enlace caduca dentro de una hora. Si no has creado esta cuenta, puedes ignorar este mensaje.",
  },
  en: {
    subject: "Verify your email for Estudia",
    introduction: "Thanks for creating an Estudia account. Verify your email to finish activating it.",
    expiry: "The link expires in one hour. If you did not create this account, you can ignore this message.",
  },
};

export function queueVerificationEmail({
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
      console.error("Verification email could not be sent", error);
    }
  });
}
