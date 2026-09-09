import "server-only";

import { getRequestLocale, type Locale } from "@/lib/email-locale";
import { sendEmail } from "@/lib/email";

// The first of two steps better-auth runs when a verified user changes their
// address: this goes to the OLD inbox, gating whether a verification email
// is even sent to the new one. Someone who only has the session (stolen
// cookie, unlocked device) but not the old inbox can't complete the swap —
// the account's email won't change unless this link is opened too.
const copy: Record<Locale, { subject: string; introduction: (newEmail: string) => string; expiry: string }> = {
  ca: {
    subject: "Confirma el canvi de correu a Estudia",
    introduction: (newEmail) => `Algú ha demanat canviar el correu del teu compte d’Estudia per ${newEmail}. Si has estat tu, confirma-ho aquí:`,
    expiry: "L’enllaç caduca d’aquí a una hora. Si no ho has demanat tu, ignora aquest missatge: el compte no canviarà de correu.",
  },
  es: {
    subject: "Confirma el cambio de correo en Estudia",
    introduction: (newEmail) => `Alguien ha solicitado cambiar el correo de tu cuenta de Estudia por ${newEmail}. Si has sido tú, confírmalo aquí:`,
    expiry: "El enlace caduca dentro de una hora. Si no lo has solicitado tú, ignora este mensaje: la cuenta no cambiará de correo.",
  },
  en: {
    subject: "Confirm the email change on Estudia",
    introduction: (newEmail) => `Someone requested changing the email on your Estudia account to ${newEmail}. If this was you, confirm it here:`,
    expiry: "The link expires in one hour. If you did not request this, ignore this message: the account's email will not change.",
  },
};

export async function sendEmailChangeConfirmation({
  email,
  newEmail,
  url,
  request,
}: {
  email: string;
  newEmail: string;
  url: string;
  request?: Request;
}) {
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL;
  const locale = getRequestLocale(request);
  const message = copy[locale];

  if (!from) {
    throw new Error("AUTH_FROM_EMAIL or CONTACT_FROM_EMAIL is not configured");
  }

  try {
    await sendEmail({
      from,
      to: email,
      subject: message.subject,
      text: [
        message.introduction(newEmail),
        "",
        url,
        "",
        message.expiry,
      ].join("\n"),
    });
  } catch (error) {
    console.error("Email change confirmation could not be sent", { from, error });
    throw error;
  }
}
