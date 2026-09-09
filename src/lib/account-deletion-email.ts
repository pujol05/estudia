import "server-only";

import { getRequestLocale, type Locale } from "@/lib/email-locale";
import { sendEmail } from "@/lib/email";

const copy: Record<Locale, { subject: string; introduction: string; sessionNote: string; expiry: string }> = {
  ca: {
    subject: "Confirma l’eliminació del teu compte a Estudia",
    introduction: "Has demanat eliminar el teu compte d’Estudia. S’esborraran totes les teves dades (assignatures, tasques, exàmens, notes i esdeveniments) i no es podrà desfer.",
    sessionNote: "Has d’estar amb la sessió iniciada al navegador on cliquis l’enllaç, o no funcionarà.",
    expiry: "L’enllaç caduca d’aquí a 24 hores. Si no ho has demanat tu, ignora aquest missatge: el compte no s’eliminarà.",
  },
  es: {
    subject: "Confirma la eliminación de tu cuenta en Estudia",
    introduction: "Has solicitado eliminar tu cuenta de Estudia. Se borrarán todos tus datos (asignaturas, tareas, exámenes, notas y eventos) y no se podrá deshacer.",
    sessionNote: "Debes tener la sesión iniciada en el navegador donde hagas clic en el enlace, o no funcionará.",
    expiry: "El enlace caduca dentro de 24 horas. Si no lo has solicitado tú, ignora este mensaje: la cuenta no se eliminará.",
  },
  en: {
    subject: "Confirm deletion of your Estudia account",
    introduction: "You requested to delete your Estudia account. All your data (subjects, tasks, exams, grades and events) will be erased and this cannot be undone.",
    sessionNote: "You must be signed in on the browser where you click the link, or it won't work.",
    expiry: "The link expires in 24 hours. If you did not request this, ignore this message: the account will not be deleted.",
  },
};

export async function sendAccountDeletionEmail({
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
        message.sessionNote,
        message.expiry,
      ].join("\n"),
    });
  } catch (error) {
    console.error("Account deletion email could not be sent", { from, error });
    throw error;
  }
}
