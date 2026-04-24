import { useState } from "react";
import { toast } from "sonner";

interface Props {
  children: string;
  language?: string;
}

export function CodeBlock({ children, language }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="relative group">
      <pre className="bg-surface-2 border border-soft rounded-sm p-4 pr-20 font-mono text-[12px] overflow-x-auto text-foreground whitespace-pre-wrap break-words">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-soft text-muted hover:text-cyan hover:border-cyan transition bg-surface"
        aria-label="Copy code"
      >
        {copied ? "✓ Copied" : "Copy"}
        {language && <span className="ml-1 text-muted">· {language}</span>}
      </button>
    </div>
  );
}
