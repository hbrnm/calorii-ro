import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const quickAddSchema = z.object({
  food_id: z.number().int().positive(),
  quantity: z.number().positive().max(100).default(1),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  meal_date: z.string().optional(),
});

function inferMealType(): string {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  if (h < 22) return 'dinner';
  return 'snack';
}

export async function diaryRoutes(app: FastifyInstance) {
  // Toate rutele necesita autentificare
  app.addHook('preHandler', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({
        status: 401,
        title: 'Unauthorized',
        detail: 'Trebuie sa fii autentificat.',
      });
    }
  });

  // POST /meals/quick-add - adauga aliment la jurnal
  app.post('/meals/quick-add', async (req, reply) => {
    const input = quickAddSchema.parse(req.body);
    const userId = req.user.sub;

    const mealDate = input.meal_date
      ? new Date(input.meal_date)
      : new Date();
    const mealDateOnly = new Date(mealDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const mealType = input.meal_type ?? inferMealType();

    // Verifica ca alimentul exista
    const food = await prisma.food.findUnique({
      where: { id: input.food_id },
    });

    if (!food) {
      return reply.status(404).send({
        status: 404,
        title: 'Not Found',
        detail: 'Alimentul nu exista.',
      });
    }

    // Presupunem 100g per unitate de cantitate
    const gramsConsumed = 100 * input.quantity;
    const factor = gramsConsumed / 100;

    const kcal = Number(food.caloriesKcal) * factor;
    const proteinG = Number(food.proteinG) * factor;
    const carbsG = Number(food.carbsG) * factor;
    const fatG = Number(food.fatG) * factor;

    // Gaseste sau creeaza masa
    let meal = await prisma.meal.findFirst({
      where: { userId, mealDate: mealDateOnly, mealType },
    });

    if (!meal) {
      meal = await prisma.meal.create({
        data: {
          userId,
          mealType,
          mealDate: mealDateOnly,
        },
      });
    }

    // Adauga item
    const item = await prisma.mealItem.create({
      data: {
        mealId: meal.id,
        foodId: food.id,
        quantity: input.quantity,
        gramsConsumed,
        kcal,
      },
    });

    return reply.status(201).send({
      meal_id: meal.id,
      meal_type: meal.mealType,
      meal_date: meal.mealDate.toISOString().split('T')[0],
      item: {
        id: item.id,
        food_id: food.id,
        name_ro: food.nameRo,
        quantity: Number(item.quantity),
        grams_consumed: Number(item.gramsConsumed),
        kcal: Number(item.kcal),
        protein_g: proteinG,
        carbs_g: carbsG,
        fat_g: fatG,
      },
    });
  });

  // GET /diary/:date - vedea jurnalul unei zile
  app.get('/diary/:date', async (req, reply) => {
    const { date } = req.params as { date: string };
    const userId = req.user.sub;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return reply.status(400).send({
        status: 400,
        title: 'Bad Request',
        detail: 'Format data invalid. Foloseste YYYY-MM-DD.',
      });
    }

    const mealDate = new Date(date + 'T00:00:00.000Z');

    const meals = await prisma.meal.findMany({
      where: { userId, mealDate },
      include: {
        items: {
          include: { food: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculeaza totaluri
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const meal of meals) {
      for (const item of meal.items) {
        const factor = Number(item.gramsConsumed) / 100;
        totalKcal += Number(item.kcal);
        totalProtein += Number(item.food.proteinG) * factor;
        totalCarbs += Number(item.food.carbsG) * factor;
        totalFat += Number(item.food.fatG) * factor;
      }
    }

    return {
      date,
      totals: {
        kcal: Math.round(totalKcal * 100) / 100,
        protein_g: Math.round(totalProtein * 100) / 100,
        carbs_g: Math.round(totalCarbs * 100) / 100,
        fat_g: Math.round(totalFat * 100) / 100,
      },
      meals_count: meals.length,
      items_count: meals.reduce((sum, m) => sum + m.items.length, 0),
      meals: meals.map((m) => ({
        id: m.id,
        meal_type: m.mealType,
        items: m.items.map((item) => ({
          id: item.id,
          food_id: item.food.id,
          name_ro: item.food.nameRo,
          quantity: Number(item.quantity),
          grams_consumed: Number(item.gramsConsumed),
          kcal: Number(item.kcal),
        })),
      })),
    };
  });

  // DELETE /meals/:mealId/items/:itemId - sterge un aliment
  app.delete('/meals/:mealId/items/:itemId', async (req, reply) => {
    const { mealId, itemId } = req.params as { mealId: string; itemId: string };
    const userId = req.user.sub;

    const itemIdNum = parseInt(itemId, 10);
    if (isNaN(itemIdNum)) {
      return reply.status(400).send({
        status: 400,
        title: 'Bad Request',
        detail: 'ID invalid.',
      });
    }

    // Verifica ca itemul apartine userului
    const item = await prisma.mealItem.findFirst({
      where: {
        id: itemIdNum,
        meal: { userId, id: mealId },
      },
    });

    if (!item) {
      return reply.status(404).send({
        status: 404,
        title: 'Not Found',
        detail: 'Itemul nu exista.',
      });
    }

    await prisma.mealItem.delete({ where: { id: itemIdNum } });

    return reply.status(204).send();
  });
}