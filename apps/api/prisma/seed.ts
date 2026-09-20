import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const foods = [
  // TRADITIONALE ROMANESTI
  { nameRo: 'Mamaliga', nameEn: 'Polenta', kcal: 70, p: 2.0, c: 15.0, f: 0.0, traditional: true },
  { nameRo: 'Sarmale cu carne de porc', nameEn: 'Pork stuffed cabbage rolls', kcal: 108, p: 5.8, c: 3.1, f: 7.8, traditional: true },
  { nameRo: 'Ciorba de burta', nameEn: 'Tripe soup', kcal: 135, p: 8.0, c: 4.0, f: 9.0, traditional: true },
  { nameRo: 'Ciorba de perisoare', nameEn: 'Meatball sour soup', kcal: 95, p: 6.5, c: 5.5, f: 4.5, traditional: true },
  { nameRo: 'Ciorba de fasole cu afumatura', nameEn: 'Bean soup with smoked meat', kcal: 130, p: 7.0, c: 14.0, f: 4.5, traditional: true },
  { nameRo: 'Ciorba de legume', nameEn: 'Vegetable sour soup', kcal: 45, p: 2.0, c: 8.0, f: 0.8, traditional: true },
  { nameRo: 'Tocanita de praz cu masline', nameEn: 'Leek stew with olives', kcal: 85, p: 1.5, c: 8.0, f: 5.5, traditional: true },
  { nameRo: 'Tochitura moldoveneasca', nameEn: 'Moldavian stew', kcal: 220, p: 18.0, c: 3.0, f: 15.0, traditional: true },
  { nameRo: 'Ostropel de pui', nameEn: 'Chicken ostropel', kcal: 145, p: 15.0, c: 4.0, f: 7.5, traditional: true },
  { nameRo: 'Ardei umpluti', nameEn: 'Stuffed bell peppers', kcal: 115, p: 6.0, c: 6.5, f: 7.0, traditional: true },
  { nameRo: 'Ghiveci de legume', nameEn: 'Vegetable ghiveci', kcal: 75, p: 1.8, c: 10.0, f: 3.0, traditional: true },
  { nameRo: 'Salata de vinete', nameEn: 'Eggplant salad', kcal: 130, p: 1.2, c: 6.0, f: 11.0, traditional: true },
  { nameRo: 'Salata de boeuf', nameEn: 'Beef salad (Olivier)', kcal: 165, p: 6.5, c: 7.0, f: 12.5, traditional: true },
  { nameRo: 'Salata orientala', nameEn: 'Oriental salad', kcal: 140, p: 3.5, c: 14.0, f: 8.0, traditional: true },
  { nameRo: 'Zacusca', nameEn: 'Zacusca (vegetable spread)', kcal: 95, p: 1.5, c: 8.0, f: 6.0, traditional: true },
  { nameRo: 'Papanasi cu smantana si dulceata', nameEn: 'PapanaÈ™i with sour cream', kcal: 280, p: 8.0, c: 35.0, f: 12.0, traditional: true },
  { nameRo: 'Cozonac cu nuca', nameEn: 'Walnut cozonac', kcal: 330, p: 7.0, c: 45.0, f: 13.0, traditional: true },
  { nameRo: 'Placinta cu mere', nameEn: 'Apple pie', kcal: 245, p: 3.5, c: 35.0, f: 10.5, traditional: true },
  { nameRo: 'Galuste cu prune', nameEn: 'Plum dumplings', kcal: 185, p: 3.5, c: 32.0, f: 5.0, traditional: true },
  { nameRo: 'Bulz ciobanesc', nameEn: 'Shepherd polenta with cheese', kcal: 210, p: 8.0, c: 22.0, f: 10.5, traditional: true },
];

async function main() {
  console.log('Populez baza de date cu alimente romanesti...\n');

  // Sterge alimentele existente (pentru re-run)
  const deleted = await prisma.food.deleteMany({});
  console.log('Sters ' + deleted.count + ' alimente existente.');

  // Adauga alimentele
  let added = 0;
  for (const f of foods) {
    await prisma.food.create({
      data: {
        nameRo: f.nameRo,
        nameEn: f.nameEn,
        caloriesKcal: f.kcal,
        proteinG: f.p,
        carbsG: f.c,
        fatG: f.f,
        isTraditionalRo: f.traditional,
      },
    });
    added++;
  }

  console.log('Adaugat ' + added + ' alimente romanesti.\n');

  const total = await prisma.food.count();
  console.log('Total alimente in baza de date: ' + total);
  console.log('Gata!\n');
}

main()
  .catch((e) => {
    console.error('Eroare:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });