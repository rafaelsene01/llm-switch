import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ADMIN_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
