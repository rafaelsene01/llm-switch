import { Terminal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HomeConfigActions } from '@/components/home/HomeConfigActions';
import { HomeStats } from '@/components/home/HomeStats';
import { PageHeader } from '@/components/layout/PageHeader';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'https://seu-gateway.com';

const endpoints = [
  {
    method: 'POST',
    path: '/v1/chat/completions',
    desc: 'Chat com qualquer provider (OpenAI-compat)',
  },
  { method: 'GET', path: '/v1/models', desc: 'Lista modelos disponíveis para o token' },
  { method: 'GET', path: '/v1/gateway/rules', desc: 'Lista regras de sanitização ativas' },
];

const curlExample = (url: string) => `curl ${url}/v1/chat/completions \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai:gpt-4o-mini",
    "messages": [{"role": "user", "content": "Olá!"}]
  }'`;

const pythonExample = (url: string) => `from openai import OpenAI

client = OpenAI(
    api_key="SEU_TOKEN",
    base_url="${url}/v1",
)

response = client.chat.completions.create(
    model="openai:gpt-4o-mini",
    messages=[{"role": "user", "content": "Olá!"}],
)

print(response.choices[0].message.content)`;

const nodeExample = (url: string) => `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "SEU_TOKEN",
  baseURL: "${url}/v1",
});

const response = await client.chat.completions.create({
  model: "openai:gpt-4o-mini",
  messages: [{ role: "user", content: "Olá!" }],
});

console.log(response.choices[0].message.content);`;

export default function HomePage() {
  return (
    <div>
      <PageHeader
        title="LLM Gateway"
        description="Proxy OpenAI-compatível com sanitização de PII, multi-provider e autenticação por cliente."
        actions={<HomeConfigActions />}
      />

      <div className="space-y-8">
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

        {/* Integration examples */}
        <div>
          <p className="text-section-title mb-1 flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" />
            Exemplos de integração
          </p>
          <p className="text-caption mb-4">
            Base URL:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
              {GATEWAY_URL}
            </code>
          </p>

          <Tabs defaultValue="curl">
            <TabsList className="mb-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="python">Python SDK</TabsTrigger>
              <TabsTrigger value="node">Node.js SDK</TabsTrigger>
            </TabsList>

            <TabsContent value="curl">
              <Card className="shadow-card border-border/50">
                <CardContent className="pt-4 pb-4">
                  <pre className="overflow-x-auto text-sm font-mono leading-relaxed">
                    <code>{curlExample(GATEWAY_URL)}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="python">
              <Card className="shadow-card border-border/50">
                <CardContent className="pt-4 pb-4">
                  <pre className="overflow-x-auto text-sm font-mono leading-relaxed">
                    <code>{pythonExample(GATEWAY_URL)}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="node">
              <Card className="shadow-card border-border/50">
                <CardContent className="pt-4 pb-4">
                  <pre className="overflow-x-auto text-sm font-mono leading-relaxed">
                    <code>{nodeExample(GATEWAY_URL)}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
