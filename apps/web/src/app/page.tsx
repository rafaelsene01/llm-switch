import { Terminal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HomeConfigActions } from '@/components/home/HomeConfigActions';
import { HomeStats } from '@/components/home/HomeStats';
import { PageHeader } from '@/components/layout/PageHeader';
import { LangTabs } from '@/components/home/CodeBlock';
import { CopyUrlBadge } from '@/components/home/CopyUrlBadge';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'https://seu-gateway.com';

const endpoints = [
  {
    method: 'POST',
    path: '/v1/chat/completions',
    desc: 'Chat com qualquer provider — suporta stream: true (SSE)',
  },
  { method: 'GET', path: '/v1/models', desc: 'Lista modelos disponíveis para o token' },
  { method: 'GET', path: '/v1/models/:model_id', desc: 'Retorna metadados de um modelo específico' },
  { method: 'POST', path: '/v1/embeddings', desc: 'Gera embeddings vetoriais (OpenAI, Google, Mistral, Ollama, LM Studio)' },
];

const chatCurlExample = (url: string) => `curl ${url}/v1/chat/completions \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai:gpt-4o-mini",
    "messages": [{"role": "user", "content": "Olá!"}]
  }'`;

const chatPythonExample = (url: string) => `from openai import OpenAI

client = OpenAI(
    api_key="SEU_TOKEN",
    base_url="${url}/v1",
)

response = client.chat.completions.create(
    model="openai:gpt-4o-mini",
    messages=[{"role": "user", "content": "Olá!"}],
)

print(response.choices[0].message.content)`;

const chatNodeExample = (url: string) => `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "SEU_TOKEN",
  baseURL: "${url}/v1",
});

const response = await client.chat.completions.create({
  model: "openai:gpt-4o-mini",
  messages: [{ role: "user", content: "Olá!" }],
});

console.log(response.choices[0].message.content);`;

const streamCurlExample = (url: string) => `curl -N ${url}/v1/chat/completions \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai:gpt-4o-mini",
    "stream": true,
    "messages": [{"role": "user", "content": "Olá!"}]
  }'`;

const streamPythonExample = (url: string) => `from openai import OpenAI

client = OpenAI(
    api_key="SEU_TOKEN",
    base_url="${url}/v1",
)

stream = client.chat.completions.create(
    model="openai:gpt-4o-mini",
    messages=[{"role": "user", "content": "Olá!"}],
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`;

const streamNodeExample = (url: string) => `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "SEU_TOKEN",
  baseURL: "${url}/v1",
});

const stream = await client.chat.completions.create({
  model: "openai:gpt-4o-mini",
  messages: [{ role: "user", content: "Olá!" }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`;

const modelsCurlExample = (url: string) => `curl ${url}/v1/models \\
  -H "Authorization: Bearer SEU_TOKEN"`;

const modelsPythonExample = (url: string) => `from openai import OpenAI

client = OpenAI(
    api_key="SEU_TOKEN",
    base_url="${url}/v1",
)

models = client.models.list()
for model in models.data:
    print(model.id)`;

const modelsNodeExample = (url: string) => `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "SEU_TOKEN",
  baseURL: "${url}/v1",
});

const models = await client.models.list();
for (const model of models.data) {
  console.log(model.id);
}`;

const retrieveModelCurlExample = (url: string) => `curl ${url}/v1/models/openai:gpt-4o-mini \\
  -H "Authorization: Bearer SEU_TOKEN"`;

const retrieveModelPythonExample = (url: string) => `from openai import OpenAI

client = OpenAI(
    api_key="SEU_TOKEN",
    base_url="${url}/v1",
)

model = client.models.retrieve("openai:gpt-4o-mini")
print(model.id)`;

const retrieveModelNodeExample = (url: string) => `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "SEU_TOKEN",
  baseURL: "${url}/v1",
});

const model = await client.models.retrieve("openai:gpt-4o-mini");
console.log(model.id);`;

const embeddingsCurlExample = (url: string) => `curl ${url}/v1/embeddings \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai:text-embedding-3-small",
    "input": "O céu é azul."
  }'`;

const embeddingsPythonExample = (url: string) => `from openai import OpenAI

client = OpenAI(
    api_key="SEU_TOKEN",
    base_url="${url}/v1",
)

response = client.embeddings.create(
    model="openai:text-embedding-3-small",
    input="O céu é azul.",
)

print(response.data[0].embedding)`;

const embeddingsNodeExample = (url: string) => `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "SEU_TOKEN",
  baseURL: "${url}/v1",
});

const response = await client.embeddings.create({
  model: "openai:text-embedding-3-small",
  input: "O céu é azul.",
});

console.log(response.data[0].embedding);`;


export default function HomePage() {
  return (
    <div>
      <PageHeader
        title="LLM Switch"
        description="Switch de providers OpenAI-compatível: gerencie múltiplas LLMs e aproveite os limites gratuitos de cada uma."
        actions={<HomeConfigActions />}
      />

      <div className="space-y-8">
        <HomeStats />

        <div className="h-px bg-border/40" />

        {/* Endpoints */}
        <div>
          <p className="text-section-title mb-3">Endpoints</p>
          <div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-card overflow-hidden">
            {endpoints.map(({ method, path, desc }) => (
              <div key={path} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className={`mt-px shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums ${
                  method === 'POST'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                }`}>
                  {method}
                </span>
                <div className="min-w-0">
                  <code className="text-sm font-mono">{path}</code>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration examples */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
            <p className="text-section-title">Exemplos de integração</p>
            <CopyUrlBadge url={GATEWAY_URL} />
          </div>

          <Tabs defaultValue="chat">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="stream">Stream</TabsTrigger>
              <TabsTrigger value="models">Listar modelos</TabsTrigger>
              <TabsTrigger value="model-retrieve">Buscar modelo</TabsTrigger>
              <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <LangTabs
                curl={chatCurlExample(GATEWAY_URL)}
                python={chatPythonExample(GATEWAY_URL)}
                node={chatNodeExample(GATEWAY_URL)}
              />
            </TabsContent>
            <TabsContent value="stream">
              <LangTabs
                curl={streamCurlExample(GATEWAY_URL)}
                python={streamPythonExample(GATEWAY_URL)}
                node={streamNodeExample(GATEWAY_URL)}
              />
            </TabsContent>
            <TabsContent value="models">
              <LangTabs
                curl={modelsCurlExample(GATEWAY_URL)}
                python={modelsPythonExample(GATEWAY_URL)}
                node={modelsNodeExample(GATEWAY_URL)}
              />
            </TabsContent>
            <TabsContent value="model-retrieve">
              <LangTabs
                curl={retrieveModelCurlExample(GATEWAY_URL)}
                python={retrieveModelPythonExample(GATEWAY_URL)}
                node={retrieveModelNodeExample(GATEWAY_URL)}
              />
            </TabsContent>
            <TabsContent value="embeddings">
              <LangTabs
                curl={embeddingsCurlExample(GATEWAY_URL)}
                python={embeddingsPythonExample(GATEWAY_URL)}
                node={embeddingsNodeExample(GATEWAY_URL)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
