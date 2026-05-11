// HTTP status codes that indicate the provider is overloaded/unavailable → fallback
const FALLBACK_STATUSES = new Set([429, 503, 529]);

// Message fragments that indicate quota/overload → fallback
const FALLBACK_MESSAGES = [
  'rate limit',
  'quota',
  'too many requests',
  'rate_limit',
  'provider returned error', // AI SDK: model overloaded at upstream provider
];

export function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;

  const status = (e['statusCode'] ?? e['status']) as number | undefined;
  if (status !== undefined && FALLBACK_STATUSES.has(status)) return true;

  const msg = typeof e['message'] === 'string' ? e['message'].toLowerCase() : '';
  if (FALLBACK_MESSAGES.some((s) => msg.includes(s))) return true;

  return false;
}
