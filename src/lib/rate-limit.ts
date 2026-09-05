import "server-only";

import prisma from "@/lib/prisma";

// Shares the "RateLimit" table that better-auth manages for its own
// database-backed rate limiting (see src/lib/auth.ts), so routes outside
// better-auth's control (e.g. plain API routes) can use the same fixed-window
// counter without a separate store.
export async function consumeRateLimit({
  key,
  windowSeconds,
  max,
}: {
  key: string;
  windowSeconds: number;
  max: number;
}): Promise<boolean> {
  const now = BigInt(Date.now());
  const windowMs = BigInt(windowSeconds * 1000);
  const id = crypto.randomUUID();

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" (id, key, count, "lastRequest")
    VALUES (${id}, ${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN ${now} - "RateLimit"."lastRequest" > ${windowMs} THEN 1
        ELSE "RateLimit".count + 1
      END,
      "lastRequest" = CASE
        WHEN ${now} - "RateLimit"."lastRequest" > ${windowMs} THEN ${now}
        ELSE "RateLimit"."lastRequest"
      END
    RETURNING count
  `;

  const count = rows[0]?.count ?? 1;
  return count <= max;
}
