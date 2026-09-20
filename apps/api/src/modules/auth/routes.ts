import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signAccessToken, signRefreshToken } from '../../lib/jwt.js';

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email('Email invalid').toLowerCase(),
  password: z
    .string()
    .min(8, 'Minim 8 caractere')
    .regex(/[A-Z]/, 'Trebuie o litera mare')
    .regex(/[a-z]/, 'Trebuie o litera mica')
    .regex(/[0-9]/, 'Trebuie o cifra'),
  full_name: z.string().min(2).max(150).optional(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req, reply) => {
    const input = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      return reply.status(409).send({
        status: 409,
        title: 'Conflict',
        detail: 'Exista deja un cont cu acest email.',
      });
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.full_name,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    });

    const accessToken = signAccessToken(app, {
      sub: user.id,
      email: user.email,
    });
    const refreshToken = signRefreshToken(app, {
      sub: user.id,
      email: user.email,
    });

    return reply.status(201).send({
      user,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900,
        token_type: 'Bearer',
      },
    });
  });

  app.post('/login', async (req, reply) => {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      return reply.status(401).send({
        status: 401,
        title: 'Unauthorized',
        detail: 'Email sau parola incorecta.',
      });
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      return reply.status(401).send({
        status: 401,
        title: 'Unauthorized',
        detail: 'Email sau parola incorecta.',
      });
    }

    const accessToken = signAccessToken(app, {
      sub: user.id,
      email: user.email,
    });
    const refreshToken = signRefreshToken(app, {
      sub: user.id,
      email: user.email,
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900,
        token_type: 'Bearer',
      },
    });
  });

  app.get('/me', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({
        status: 401,
        title: 'Unauthorized',
        detail: 'Token invalid sau lipsa.',
      });
    }

    const userId = req.user.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        status: 404,
        title: 'Not Found',
        detail: 'Utilizatorul nu exista.',
      });
    }

    return reply.send({ user });
  });
}