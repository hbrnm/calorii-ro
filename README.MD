# CaloriiRo

Jurnalul alimentar al românilor.

## Ce face

- 🔐 Autentificare (register/login cu JWT)
- 🍲 20 alimente tradiționale românești
- 🔍 Căutare alimente
- 📊 Jurnal zilnic cu calcul nutrițional

## Stack

- **Backend:** Node.js + Fastify + TypeScript
- **Bază de date:** PostgreSQL (Neon) + Prisma ORM
- **Autentificare:** Argon2 + JWT

## Instalare

```bash
pnpm install
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```
