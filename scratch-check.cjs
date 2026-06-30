const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany();
  const comments = await prisma.comment.findMany();
  console.log("POSTS:", JSON.stringify(posts, null, 2));
  console.log("COMMENTS:", JSON.stringify(comments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
