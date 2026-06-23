import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { profile: true }
  });
  console.log("USERS AND PHONES:");
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Email: ${u.email}, Phone: "${u.phone}", Role: ${u.role}, ProfileName: "${u.profile?.full_name}"`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
