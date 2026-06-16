import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const bcrypt = require('./backend/node_modules/bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("Klaus@6621", salt);

  await prisma.user.updateMany({
    where: {
      email: {
        in: ["alumni2@gmail.com", "alumni3@gmail.com", "kaushalstar1@gmail.com"]
      }
    },
    data: {
      password_hash: hash
    }
  });

  console.log("Passwords reset successfully to Klaus@6621!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
