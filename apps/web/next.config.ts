import path from 'path';

const isStandalone = process.env.NEXT_STANDALONE === 'true';

const nextConfig = {
  output: isStandalone ? 'standalone' : undefined,
  outputFileTracingRoot: isStandalone ? path.resolve(__dirname, '../..') : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
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
