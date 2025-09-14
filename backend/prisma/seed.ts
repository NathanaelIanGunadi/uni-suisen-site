// backend/prisma/seed.ts
/**
 * Seeds 3 users for local/dev:
 *  - teststudent@example.com / test  (STUDENT)
 *  - testreviewer@example.com / test (REVIEWER)
 *  - testadmin@example.com / test    (ADMIN)
 *
 * Idempotent: uses upsert by email.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

type Role = "STUDENT" | "REVIEWER" | "ADMIN";
type SeedUser = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: Role;
};

const SEED_USERS: SeedUser[] = [
  {
    email: "teststudent@example.com",
    firstName: "teststudent",
    lastName: null,
    role: "STUDENT",
  },
  {
    email: "testreviewer@example.com",
    firstName: "testreviewer",
    lastName: null,
    role: "REVIEWER",
  },
  {
    email: "testadmin@example.com",
    firstName: "testadmin",
    lastName: null,
    role: "ADMIN",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("test", 10);

  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        // You can omit password here if you don't want to reset it on every seed
        password: passwordHash,
        role: u.role,
        firstName: u.firstName ?? undefined,
        lastName: u.lastName ?? undefined,
      },
      create: {
        email: u.email,
        password: passwordHash,
        role: u.role,
        firstName: u.firstName ?? undefined,
        lastName: u.lastName ?? undefined,
      },
    });
  }

  console.log("✅ Seed complete: 3 users ensured.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
