import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { profile: true }
  });
  console.log("USERS IN DB:", users.map(u => ({ id: u.id, email: u.email, role: u.role, verify: u.verify_status, name: u.profile?.full_name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
