import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ADMIN_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
