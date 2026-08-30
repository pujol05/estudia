import { headers } from "next/headers";

import ProfileForm from "@/components/profile/ProfileForm";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: string }>;
};

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
