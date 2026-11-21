import { betterAuth } from 'better-auth';
import { originOf, type PilotEnv } from './common';

export function authFor(env: PilotEnv) {
  const origin = originOf(env.APP_ORIGIN);
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new Error('Configuração de autenticação incompleta.');
  return betterAuth({
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: env.PILOT_DB,
    trustedOrigins: [origin],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    advanced: {
      useSecureCookies: origin.startsWith('https:'),
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    rateLimit: { enabled: false }, // The HTTP boundary applies atomic D1 counters to auth and invitation routes.
    telemetry: { enabled: false },
    logger: { disabled: true },
  });
}
