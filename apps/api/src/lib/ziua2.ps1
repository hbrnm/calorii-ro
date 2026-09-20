# ziua2.ps1 - Creeaza toate fisierele pentru autentificare

Write-Host "Creez fisierele pentru autentificare..." -ForegroundColor Cyan

# ===== Foldere =====
$folders = @(
    "apps\api\src\lib",
    "apps\api\src\modules\auth",
    "apps\api\src\types"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    Write-Host "  Folder: $folder" -ForegroundColor Green
}

# ===== password.ts =====
$passwordContent = @'
import argon2 from 'argon2';

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "apps\api\src\lib\password.ts"), $passwordContent, $utf8NoBom)
Write-Host "  Fisier: password.ts" -ForegroundColor Green

# ===== jwt.ts =====
$jwtContent = @'
import type { FastifyInstance } from 'fastify';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export function signAccessToken(
  app: FastifyInstance,
  payload: AccessTokenPayload
): string {
  return app.jwt.sign(payload, { expiresIn: '15m' });
}

export function signRefreshToken(
  app: FastifyInstance,
  payload: AccessTokenPayload
): string {
  return app.jwt.sign(payload, { expiresIn: '30d' });
}
'@

[System.IO.File]::WriteAllText((Join-Path (Get-Location) "apps\api\src\lib\jwt.ts"), $jwtContent, $utf8NoBom)
Write-Host "  Fisier: jwt.ts" -ForegroundColor Green

# ===== fastify.d.ts =====
$dtsContent = @'
import type { FastifyInstance } from 'fastify';
import type { AccessTokenPayload } from '../lib/jwt.js';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign: (payload: AccessTokenPayload, options?: { expiresIn?: string }) => string;
      verify: <T = AccessTokenPayload>(token: string) => T;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}
'@

[System.IO.File]::WriteAllText((Join-Path (Get-Location) "apps\api\src\types\fastify.d.ts"), $dtsContent, $utf8NoBom)
Write-Host "  Fisier: fastify.d.ts" -ForegroundColor Green

# ===== auth/routes.ts =====
$authContent = @'
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
'@

[System.IO.File]::WriteAllText((Join-Path (Get-Location) "apps\api\src\modules\auth\routes.ts"), $authContent, $utf8NoBom)
Write-Host "  Fisier: auth/routes.ts" -ForegroundColor Green

# ===== server.ts (rescris) =====
$serverContent = @'
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './modules/auth/routes.js';

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
      return {
        database: 'connected',
        stats: { users: userCount, foods: foodCount },
      };
    } catch (error) {
      return {
        database: 'error',
        message: (error as Error).message,
      };
    }
  });

  await app.register(authRoutes, { prefix: '/auth' });

  try {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    await app.listen({ port, host: '0.0.0.0' });
    console.log('\n Server: http://localhost:' + port);
    console.log(' Health: http://localhost:' + port + '/health');
    console.log(' DB: http://localhost:' + port + '/health/db');
    console.log(' Auth: http://localhost:' + port + '/auth\n');
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
'@

[System.IO.File]::WriteAllText((Join-Path (Get-Location) "apps\api\src\server.ts"), $serverContent, $utf8NoBom)
Write-Host "  Fisier: server.ts" -ForegroundColor Green

Write-Host ""
Write-Host "Toate fisierele au fost create!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Urmatorul pas:" -ForegroundColor Yellow
Write-Host "  cd apps\api"
Write-Host "  pnpm dev"
Write-Host ""