import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
});

async function start() {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "calorii-api",
    version: "0.1.0",
  }));

  app.get("/health/db", async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const userCount = await prisma.user.count();
      const foodCount = await prisma.food.count();
      return {
        database: "connected",
        stats: { users: userCount, foods: foodCount },
      };
    } catch (error) {
      return {
        database: "error",
        message: (error as Error).message,
      };
    }
  });

  try {
    const port = parseInt(process.env.PORT ?? "3000", 10);
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`\n🚀 Server: http://localhost:${port}`);
    console.log(`📊 Health: http://localhost:${port}/health`);
    console.log(`🗄️  DB: http://localhost:${port}/health/db\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("\n👋 Închid serverul...");
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
});

start();
