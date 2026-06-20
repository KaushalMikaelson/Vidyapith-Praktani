import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    where: { user_id: 'bd529e16-14c6-46b8-8291-10beedc4949c' },
    orderBy: { created_at: 'desc' }
  });
  console.log("NOTIFICATIONS:", notifications);
}

main().catch(console.error).finally(() => prisma.$disconnect());
