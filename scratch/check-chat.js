import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("MESSAGES:");
  const messages = await prisma.message.findMany();
  console.log(messages);

  console.log("CONNECTIONS:");
  const connections = await prisma.connection.findMany();
  console.log(connections);

  console.log("GROUPS:");
  const groups = await prisma.group.findMany();
  console.log(groups);

  console.log("GROUP MEMBERS:");
  const members = await prisma.groupMember.findMany();
  console.log(members);
}

main().catch(console.error).finally(() => prisma.$disconnect());
