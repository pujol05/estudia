import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import ProfileForm from "@/components/profile/ProfileForm";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: string }>;
};

// Every page here sits behind auth.api.getSession() below and redirects
// anonymous visitors to /login before rendering anything real, so there is
// nothing worth indexing — this is defense in depth, not the primary guard
// (see src/app/robots.ts, which is what actually keeps crawlers out).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });

  return {
    title: `${t("title")} | Estudia`,
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect({ href: "/login", locale });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
    },
  });

  if (!user) {
    return redirect({ href: "/login", locale });
  }

  return (
    <ProfileForm
      userId={session.user.id}
      initialName={user.name}
      initialEmail={user.email}
      initialImage={user.image}
    />
  );
}
