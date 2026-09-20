# CaloriiRo

Jurnal alimentar cu API Fastify, PostgreSQL și Prisma.

## Configurare API

Copiază `apps/api/.env.example` în `apps/api/.env` și completează `DATABASE_URL`. În production, `JWT_SECRET` trebuie să aibă cel puțin 32 de caractere, iar `FRONTEND_URL` trebuie să conțină origin-urile permise, separate prin virgulă.

```bash
pnpm install
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

`GET /health` nu necesită baza de date. `GET /health/db` verifică disponibilitatea PostgreSQL.
