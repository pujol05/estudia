//Better Auth te crear compte, iniciar sessió i tancar sessió amb email i contrasenya. També permet la gestió de sessions i cookies de manera segura.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import prisma from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    nextCookies(),
  ],
});