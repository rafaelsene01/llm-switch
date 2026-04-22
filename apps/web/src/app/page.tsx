import { Terminal, Zap, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HomeConfigActions } from '@/components/home/HomeConfigActions';

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
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LLM Gateway</h1>
          <p className="mt-1 text-muted-foreground">
            Proxy OpenAI-compatível com sanitização de PII, multi-provider e autenticação por cliente.
          </p>
        </div>
        <HomeConfigActions />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Shield, title: 'Sanitização PII', desc: '20+ regras built-in para documentos, credenciais e dados financeiros' },
          { icon: Zap, title: 'Multi-provider', desc: 'OpenAI, Anthropic, Google, Mistral, OpenRouter, Ollama, LM Studio' },
          { icon: Users, title: 'Por cliente', desc: 'API keys, rate limit, modelos permitidos e auditoria por usuário' },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent className="pt-4">
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <p className="font-medium text-sm">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Endpoints</h2>
        <div className="space-y-2">
          {endpoints.map(({ method, path, desc }) => (
            <Card key={path}>
              <CardContent className="flex items-start gap-3 py-3">
                <span className="mt-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-mono font-semibold text-primary">
                  {method}
                </span>
                <div>
                  <code className="text-sm font-mono">{path}</code>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Exemplo de integração
        </h2>
        <Card>
          <CardContent className="pt-4">
            <pre className="overflow-x-auto text-sm font-mono leading-relaxed">
              <code>{curlExample}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
