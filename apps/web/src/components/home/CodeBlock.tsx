'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/40 dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {copied ? (
            <><Check className="h-3 w-3" /> Copiado</>
          ) : (
            <><Copy className="h-3 w-3" /> Copiar</>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function LangTabs({ curl, python, node }: { curl: string; python: string; node: string }) {
  return (
    <Tabs defaultValue="curl">
      <TabsList className="mb-3">
        <TabsTrigger value="curl">cURL</TabsTrigger>
        <TabsTrigger value="python">Python SDK</TabsTrigger>
        <TabsTrigger value="node">Node.js SDK</TabsTrigger>
      </TabsList>
      <TabsContent value="curl"><CodeBlock code={curl} /></TabsContent>
      <TabsContent value="python"><CodeBlock code={python} /></TabsContent>
      <TabsContent value="node"><CodeBlock code={node} /></TabsContent>
    </Tabs>
  );
}
