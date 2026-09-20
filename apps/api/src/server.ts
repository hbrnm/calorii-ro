import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './modules/auth/routes.js';
import { foodRoutes } from './modules/foods/routes.js';
import { diaryRoutes } from './modules/diary/routes.js';

const prisma = new PrismaClient();

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

async function start() {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me-32-chars-minimum',
  });

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'calorii-api',
    version: '0.1.0',
  }));

  app.get('/health/db', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const userCount = await prisma.user.count();
      const foodCount = await prisma.food.count();
      const mealCount = await prisma.meal.count();
      return {
        database: 'connected',
        stats: {
          users: userCount,
          foods: foodCount,
          meals: mealCount,
        },
      };
    } catch (error) {
      return {
        database: 'error',
        message: (error as Error).message,
      };
    }
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(foodRoutes, { prefix: '/foods' });
  await app.register(diaryRoutes);

  try {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    await app.listen({ port, host: '0.0.0.0' });
    console.log('\n Server: http://localhost:' + port);
    console.log(' Health: http://localhost:' + port + '/health');
    console.log(' DB: http://localhost:' + port + '/health/db');
    console.log(' Auth: http://localhost:' + port + '/auth');
    console.log(' Foods: http://localhost:' + port + '/foods');
    console.log(' Diary: http://localhost:' + port + '/diary\n');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n Inchid serverul...');
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
});

start();