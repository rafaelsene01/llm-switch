'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyUrlBadge({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center gap-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground border border-border/40 hover:text-foreground hover:bg-muted/80 transition-colors"
    >
      <span>{url}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0" />
      ) : (
        <Copy className="h-3 w-3 shrink-0" />
      )}
    </button>
  );
}
