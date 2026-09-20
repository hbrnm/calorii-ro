import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { authRoutes } from './modules/auth/routes.js';
import { foodRoutes } from './modules/foods/routes.js';
import { diaryRoutes } from './modules/diary/routes.js';
import { prisma } from './lib/prisma.js';
function jwtSecret() { const secret = process.env.JWT_SECRET; if (!secret && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET este obligatoriu in production.'); if (secret && secret.length < 32) throw new Error('JWT_SECRET trebuie sa aiba cel putin 32 de caractere.'); return secret ?? 'dev-secret-change-me-32-chars-minimum'; }
function corsOrigins() { const configured = (process.env.FRONTEND_URL ?? '').split(',').map((v) => v.trim()).filter(Boolean); return process.env.NODE_ENV === 'production' ? configured : [...configured, 'http://localhost:3000', 'http://localhost:5173']; }
export function buildApp() { const app = Fastify({ logger: { transport: { target: 'pino-pretty', options: { colorize: true } } } }); app.register(cors, { origin: corsOrigins(), credentials: true }); app.register(jwt, { secret: jwtSecret() }); app.setErrorHandler((error, req, reply) => { if (error instanceof ZodError) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues.map((i) => i.message).join(', ') } }); if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return reply.status(409).send({ error: { code: 'CONFLICT', message: 'Resursa exista deja.' } }); const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500; req.log.error(error); return reply.status(status).send({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message: status === 500 ? 'A aparut o eroare interna.' : error.message } }); }); app.get('/health', async () => ({ status: 'ok', service: 'calorii-api', version: '0.1.0' })); app.get('/health/db', async (_req, reply) => { try { await prisma.$queryRaw`SELECT 1`; return { status: 'ok', database: 'connected' }; } catch { return reply.status(503).send({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Baza de date nu este disponibila.' } }); } }); app.register(authRoutes, { prefix: '/auth' }); app.register(foodRoutes, { prefix: '/foods' }); app.register(diaryRoutes); return app; }
async function start() { const app = buildApp(); try { const port = Number.parseInt(process.env.PORT ?? '3000', 10); await app.listen({ port, host: '0.0.0.0' }); } catch (error) { app.log.error(error); await prisma.$disconnect(); process.exit(1); } }
if (process.env.NODE_ENV !== 'test') void start();
