import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

async function setISTTimezone() {
  await prisma.$executeRawUnsafe("SET TIME ZONE 'Asia/Kolkata'");
}

// Call this function once at the start
setISTTimezone().catch((e) => {
  console.error("Error setting timezone:", e);
});

export default prisma;
