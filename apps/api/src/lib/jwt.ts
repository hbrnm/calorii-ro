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