import { Terminal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { HomeConfigActions } from '@/components/home/HomeConfigActions';
import { HomeStats } from '@/components/home/HomeStats';
import { PageHeader } from '@/components/layout/PageHeader';

const endpoints = [
  {
    method: 'POST',
    path: '/v1/chat/completions',
    desc: 'Chat com qualquer provider (OpenAI-compat)',
  },
  { method: 'GET', path: '/v1/models', desc: 'Lista modelos disponíveis para o token' },
  { method: 'GET', path: '/v1/gateway/rules', desc: 'Lista regras de sanitização ativas' },
];

const curlExample = `curl https://seu-gateway.com/v1/chat/completions \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai:gpt-4o-mini",
    "messages": [{"role": "user", "content": "Olá!"}]
  }'`;

export default function HomePage() {
  return (
    <div>
      <PageHeader
        title="LLM Gateway"
        description="Proxy OpenAI-compatível com sanitização de PII, multi-provider e autenticação por cliente."
        actions={<HomeConfigActions />}
      />

      <div className="space-y-8">
        {/* Stats */}
        <HomeStats />

        <Separator className="opacity-40" />

        {/* Endpoints */}
        <div>
          <p className="text-section-title mb-4">Endpoints</p>
          <div className="space-y-2">
            {endpoints.map(({ method, path, desc }) => (
              <div key={path} className="flex items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 shadow-card">
                <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-mono font-semibold text-primary">
                  {method}
                </span>
                <div>
                  <code className="text-sm font-mono">{path}</code>
                  <p className="text-caption mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Curl example */}
        <div>
          <p className="text-section-title mb-4 flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" />
            Exemplo de integração
          </p>
          <Card className="shadow-card border-border/50">
            <CardContent className="pt-4 pb-4">
              <pre className="overflow-x-auto text-sm font-mono leading-relaxed">
                <code>{curlExample}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
