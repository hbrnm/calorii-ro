import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function foodRoutes(app: FastifyInstance) {
  // GET /foods - lista toate alimentele
  app.get('/', async () => {
    const foods = await prisma.food.findMany({
      orderBy: { nameRo: 'asc' },
    });

    return {
      total: foods.length,
      data: foods.map(formatFood),
    };
  });

  // GET /foods/search?q=mamaliga - cautare
  app.get('/search', async (req) => {
    const { q } = req.query as { q?: string };

    if (!q || q.length < 2) {
      return {
        query: q ?? '',
        total: 0,
        data: [],
        message: 'Introdu minim 2 caractere pentru cautare.',
      };
    }

    const foods = await prisma.food.findMany({
      where: {
        OR: [
          { nameRo: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { nameRo: 'asc' },
      take: 20,
    });

    return {
      query: q,
      total: foods.length,
      data: foods.map(formatFood),
    };
  });

  // GET /foods/traditional - doar mancaruri traditionale
  app.get('/traditional', async () => {
    const foods = await prisma.food.findMany({
      where: { isTraditionalRo: true },
      orderBy: { nameRo: 'asc' },
    });

    return {
      total: foods.length,
      data: foods.map(formatFood),
    };
  });

  // GET /foods/:id - detalii aliment
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const foodId = parseInt(id, 10);

    if (isNaN(foodId)) {
      return reply.status(400).send({
        status: 400,
        title: 'Bad Request',
        detail: 'ID invalid.',
      });
    }

    const food = await prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      return reply.status(404).send({
        status: 404,
        title: 'Not Found',
        detail: 'Alimentul nu exista.',
      });
    }

    return formatFood(food);
  });
}

function formatFood(f: any) {
  return {
    id: f.id,
    name_ro: f.nameRo,
    name_en: f.nameEn,
    calories_kcal: Number(f.caloriesKcal),
    protein_g: Number(f.proteinG),
    carbs_g: Number(f.carbsG),
    fat_g: Number(f.fatG),
    is_traditional_ro: f.isTraditionalRo,
  };
}