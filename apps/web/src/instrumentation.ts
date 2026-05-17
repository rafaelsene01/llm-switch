export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node');
  const { SimpleSpanProcessor } = await import('@opentelemetry/sdk-trace-base');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const { resourceFromAttributes } = await import('@opentelemetry/resources');
  const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');

  const exporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'llm-switch-web',
    }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  provider.register();
}
