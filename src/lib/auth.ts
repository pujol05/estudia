//Better Auth te crear compte, iniciar sessió i tancar sessió amb email i contrasenya. També permet la gestió de sessions i cookies de manera segura.

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
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

  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
  },

  databaseHooks: {
    user: {
      update: {
        async before(user, context) {
          if (context?.path !== "/update-user") {
            return;
          }

          const data = { ...user };

          if ("name" in user && user.name !== undefined) {
            if (typeof user.name !== "string") {
              throw new APIError("BAD_REQUEST", { message: "Invalid name" });
            }

            const normalizedName = user.name.trim();

            if (normalizedName.length < 2 || normalizedName.length > 80) {
              throw new APIError("BAD_REQUEST", { message: "Invalid name" });
            }

            data.name = normalizedName;
          }

          if ("image" in user && user.image !== undefined) {
            throw new APIError("BAD_REQUEST", {
              message: "Profile images must be updated through the upload endpoint",
            });
          }

          return { data };
        },
      },
    },
  },

  plugins: [
    nextCookies(),
  ],
});
