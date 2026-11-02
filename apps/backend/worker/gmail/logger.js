const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logEvent(level, message, metadata = null) {
  console.log(`[${level.toUpperCase()}] ${message}`);
  try {
    await prisma.workerLog.create({
      data: {
        level,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (e) {
    console.error('Error saving worker log:', e.message);
  }
}

module.exports = { logEvent, prisma };
