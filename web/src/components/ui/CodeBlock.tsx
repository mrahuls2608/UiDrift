'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './Button';

export interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
}

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <figure className="overflow-hidden rounded-md border border-border bg-surface">
      <figcaption className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="font-mono text-xs text-muted">{filename ?? language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          aria-label={copied ? 'Copied' : `Copy ${filename ?? 'code'}`}
        >
          {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </figcaption>
      <pre
        className="max-h-[480px] overflow-auto p-4 text-sm"
        tabIndex={0}
        aria-label={`${filename ?? language} source`}
      >
        <code className={`font-mono language-${language}`}>{code}</code>
      </pre>
    </figure>
  );
}
