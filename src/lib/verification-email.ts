import "server-only";

import { getRequestLocale, type Locale } from "@/lib/email-locale";
import { sendEmail } from "@/lib/email";

type Copy = { subject: string; introduction: string; expiry: string };

// better-auth reuses this same callback for two different situations: a
// fresh sign-up (new user, emailVerified: false) and confirming a changed
// email address on an already-verified account. The wording has to match,
// or a returning user gets a "thanks for creating an account" email for
// something they didn't do.
const signUpCopy: Record<Locale, Copy> = {
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

const emailChangeCopy: Record<Locale, Copy> = {
  ca: {
    subject: "Confirma el nou correu d’Estudia",
    introduction: "Has demanat canviar el correu del teu compte d’Estudia. Verifica aquesta adreça per confirmar el canvi.",
    expiry: "L’enllaç caduca d’aquí a una hora. Si no has demanat aquest canvi, pots ignorar aquest missatge.",
  },
  es: {
    subject: "Confirma tu nuevo correo de Estudia",
    introduction: "Has solicitado cambiar el correo de tu cuenta de Estudia. Verifica esta dirección para confirmar el cambio.",
    expiry: "El enlace caduca dentro de una hora. Si no has solicitado este cambio, puedes ignorar este mensaje.",
  },
  en: {
    subject: "Confirm your new Estudia email",
    introduction: "You requested to change the email address on your Estudia account. Verify this address to confirm the change.",
    expiry: "The link expires in one hour. If you did not request this change, you can ignore this message.",
  },
};

// Sent inline rather than through `after()`: better-auth already decides
// whether to await or background this, and awaiting it is what lets the
// resend endpoint report a delivery failure instead of silently claiming
// the message was sent.
export async function sendVerificationEmail({
  email,
  url,
  request,
  isEmailChange = false,
}: {
  email: string;
  url: string;
  request?: Request;
  isEmailChange?: boolean;
}) {
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL;
  const locale = getRequestLocale(request);
  const message = (isEmailChange ? emailChangeCopy : signUpCopy)[locale];

  if (!from) {
    throw new Error("AUTH_FROM_EMAIL or CONTACT_FROM_EMAIL is not configured");
  }

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
    console.error("Verification email could not be sent", { from, error });
    throw error;
  }
}
