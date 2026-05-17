import path from 'path';

const isStandalone = process.env.NEXT_STANDALONE === 'true';

const nextConfig = {
  output: isStandalone ? 'standalone' : undefined,
  outputFileTracingRoot: isStandalone ? path.resolve(__dirname, '../..') : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/sdk-trace-base',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
    '@opentelemetry/api',
  ],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        stream: false,
        net: false,
        tls: false,
        http2: false,
        dns: false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    return [
      { source: '/admin/:path*', destination: `${apiUrl}/admin/:path*` },
      { source: '/v1/:path*', destination: `${apiUrl}/v1/:path*` },
      { source: '/health', destination: `${apiUrl}/health` },
    ];
  },
};

export default nextConfig;
