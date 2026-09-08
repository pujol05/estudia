import type { Metadata } from "next";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

// The URL carries a single-use token, so it's never worth indexing or sharing.
export const metadata: Metadata = {
  title: "Estudia",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token = "", error } = await searchParams;

  return (
    <ResetPasswordForm
      token={token}
      hasInvalidToken={Boolean(error)}
    />
  );
}
