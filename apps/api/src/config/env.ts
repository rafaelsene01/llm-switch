import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  ADMIN_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
