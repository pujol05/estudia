import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ProfileForm from "@/components/profile/ProfileForm";
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
    redirect(`/${locale}/login`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      birthDate: true,
    },
  });

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <ProfileForm
      initialName={user.name}
      initialEmail={user.email}
      initialImage={user.image}
      initialBirthDate={user.birthDate?.toISOString().slice(0, 10) ?? ""}
    />
  );
}
