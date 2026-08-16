//Aquest fitxer es la porta entre nextjs i postgreSQL, qualsevol part del servidor que necesiti la BD pot fer
// const users = await prisma.user.findMany() per exemple.
/* 
page / API / server action
          ↓
    src/lib/prisma.ts
          ↓
      Prisma Client
          ↓
       adapter-pg
          ↓
      PostgreSQL
*/

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Create a singleton PrismaClient instance to prevent exhausting database connections in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

//connecta amb la BD de postgreSQL amb l'adaptador PrismaPg i la url de la BD que es troba a .env
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Create a singleton PrismaClient instance to prevent exhausting database connections in development
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

// If we're in development mode, attach the PrismaClient instance to the global object
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;