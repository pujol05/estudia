import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
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
