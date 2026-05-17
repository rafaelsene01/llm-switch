import { config } from 'dotenv';
config();

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { trace } from '@opentelemetry/api';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
  const otlpUrl = `${endpoint}/v1/traces`;
  try {
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'llm-switch-api',
        [ATTR_SERVICE_VERSION]: '2.0.0',
      }),
      spanProcessors: [
        new SimpleSpanProcessor(new OTLPTraceExporter({ url: otlpUrl })),
      ],
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: 30_000,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();

    new HostMetrics({ name: 'llm-switch-api' }).start();

    process.on('SIGTERM', () => sdk.shutdown());
  } catch {
    // sdk init failure is non-fatal
  }
}

export const tracer = trace.getTracer('llm-switch-api');
