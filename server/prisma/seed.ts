import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const SEED_USERS: { name: string; email: string; role: Role }[] = [
  { name: 'Admin User', email: 'admin@example.com', role: Role.ADMIN },
  { name: 'Sales User', email: 'sales@example.com', role: Role.SALES },
  { name: 'Warehouse User', email: 'warehouse@example.com', role: Role.WAREHOUSE },
  { name: 'Accounts User', email: 'accounts@example.com', role: Role.ACCOUNTS },
];

const SEED_PASSWORD = 'Password123!';

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const seedUser of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: { ...seedUser, passwordHash },
    });
  }

  console.log(`Seeded ${SEED_USERS.length} users. Password for all: ${SEED_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
