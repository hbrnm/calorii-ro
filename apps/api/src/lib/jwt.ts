import type { FastifyInstance } from 'fastify';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type?: 'access' | 'refresh';
  jti?: string;
}

export function signAccessToken(app: FastifyInstance, payload: AccessTokenPayload): string {
  return app.jwt.sign({ ...payload, type: 'access' }, { expiresIn: '15m' });
}

export function signRefreshToken(app: FastifyInstance, payload: AccessTokenPayload): string {
  return app.jwt.sign({ ...payload, type: 'refresh' }, { expiresIn: '30d' });
}
