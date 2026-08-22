//Better Auth te crear compte, iniciar sessió i tancar sessió amb email i contrasenya. També permet la gestió de sessions i cookies de manera segura.

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import prisma from "@/lib/prisma";
import { isValidProfileImageDataUrl } from "@/lib/profile-image";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      birthDate: {
        type: "date",
        required: false,
      },
    },
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

          if ("name" in user) {
            if (typeof user.name !== "string") {
              throw new APIError("BAD_REQUEST", { message: "Invalid name" });
            }

            const normalizedName = user.name.trim();

            if (normalizedName.length < 2 || normalizedName.length > 80) {
              throw new APIError("BAD_REQUEST", { message: "Invalid name" });
            }

            data.name = normalizedName;
          }

          if (
            "image" in user &&
            user.image !== null &&
            (typeof user.image !== "string" ||
              !isValidProfileImageDataUrl(user.image))
          ) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid profile image",
            });
          }

          if ("birthDate" in user && user.birthDate !== null) {
            const birthDate =
              user.birthDate instanceof Date
                ? user.birthDate
                : new Date(String(user.birthDate));
            const earliestBirthDate = new Date("1900-01-01T00:00:00.000Z");

            if (
              Number.isNaN(birthDate.getTime()) ||
              birthDate < earliestBirthDate ||
              birthDate > new Date()
            ) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid birth date",
              });
            }

            data.birthDate = birthDate;
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
