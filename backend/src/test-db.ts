import { PrismaClient } from '@prisma/client';

const candidateUrls = [
  "postgresql://postgres:Kaushal@123@localhost:5432/postgres?schema=public",
  "postgresql://postgres:kaushal@123@localhost:5432/postgres?schema=public",
  "postgresql://postgres:Kaushal123@localhost:5432/postgres?schema=public",
  "postgresql://postgres:kaushal123@localhost:5432/postgres?schema=public",
  "postgresql://postgres:rkmv@localhost:5432/postgres?schema=public",
  "postgresql://postgres:rkmv123@localhost:5432/postgres?schema=public",
  "postgresql://postgres:vidyapith@localhost:5432/postgres?schema=public",
  "postgresql://postgres:vidyapith123@localhost:5432/postgres?schema=public"
];

async function tryConnect(url: string) {
  process.env.DATABASE_URL = url;
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: []
  });
  try {
    await client.$connect();
    await client.$executeRawUnsafe("SELECT 1");
    await client.$disconnect();
    return { success: true, error: null };
  } catch (e: any) {
    await client.$disconnect();
    return { success: false, error: e.message || e };
  }
}

async function main() {
  console.log("Analyzing local PostgreSQL connection errors with extra passwords...");
  for (const url of candidateUrls) {
    console.log(`\nTrying URL: ${url.replace(/:[^:@]+@/, ':***@')}`);
    const result = await tryConnect(url);
    if (result.success) {
      console.log(`SUCCESS! Working URL: ${url}`);
      return;
    } else {
      console.log(`FAILED with error: ${result.error}`);
    }
  }
}

main();
