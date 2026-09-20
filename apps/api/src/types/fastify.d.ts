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