import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// Force a new instance by overriding the old global one to get latest generated client
const prisma = prismaClientSingleton()
globalThis.prismaGlobal = prisma

export default prisma
