import "server-only";

import { getRequestLocale, type Locale } from "@/lib/email-locale";
import { sendEmail } from "@/lib/email";

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

export async function sendPasswordResetEmail({
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
    console.error("Password reset email could not be sent", { from, error });
    throw error;
  }
}
