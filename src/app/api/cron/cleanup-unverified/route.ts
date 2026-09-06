import prisma from "@/lib/prisma";

// Unverified accounts cannot sign in, but they do hold their email address
// hostage: better-auth answers a second sign-up for the same address with a
// generic success and sends nothing, so the address stays unusable forever.
// A week is long enough for someone who opens their mail late, short enough
// that a mistyped address frees up on its own.
const MAX_AGE_DAYS = 7;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET is not configured");
    return Response.json({ error: "Not configured" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  // Sessions, accounts, subjects, events and study sessions all cascade from
  // the user row, so this is the only delete needed.
  const { count } = await prisma.user.deleteMany({
    where: {
      emailVerified: false,
      createdAt: { lt: cutoff },
    },
  });

  console.log(`Removed ${count} unverified accounts created before ${cutoff.toISOString()}`);

  return Response.json({ deleted: count });
}
