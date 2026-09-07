import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface FormattedMarkdownProps {
  content: string;
}

// Utility to remove all emojis
export function stripEmojis(str: string): string {
  return str.replace(
    /([\u{1F300}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2B50}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23EC}]|[\u{23F0}]|[\u{23F3}])/gu,
    ''
  );
}

// Helper to render inline markdown (bold, code, links)
function renderInline(text: string): React.ReactNode[] {
  // Regex to match inline code (`code`), bold (**bold** or __bold__), and italic (*italic* or _italic_)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeContent = part.slice(1, -1);
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-900 border border-slate-700/80 text-cyan-300 font-mono text-[11px] select-text"
        >
          {codeContent}
        </code>
      );
    }

    // Bold: **bold** or __bold__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      const boldContent = part.slice(2, -2);
      return (
        <strong key={i} className="font-bold text-white">
          {renderInline(boldContent)}
        </strong>
      );
    }

    // Italic: *italic* or _italic_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      const italicContent = part.slice(1, -1);
      return (
        <em key={i} className="italic text-slate-300">
          {renderInline(italicContent)}
        </em>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 hover:underline inline-flex items-center"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// Code Block Component with Copy Action
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center space-x-1.5 uppercase font-bold tracking-wider text-cyan-400">
          <Terminal className="w-3.5 h-3.5" />
          <span>{language || 'COMMAND'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Copy Code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-slate-200 text-[11px] leading-relaxed select-text font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const FormattedMarkdown: React.FC<FormattedMarkdownProps> = ({ content }) => {
  if (!content) return null;

  // 1. Strip emojis and sanitize input
  const cleanContent = stripEmojis(content);

  // 2. Parse fenced code blocks first
  const blocks: React.ReactNode[] = [];
  const lines = cleanContent.split('\n');

  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const isOrdered = currentList.type === 'ol';
    blocks.push(
      isOrdered ? (
        <ol key={`ol-${blocks.length}`} className="my-2 space-y-1.5 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-slate-300 text-xs">
              <span className="font-mono text-cyan-400 font-bold shrink-0 text-[11px] mt-0.5">
                {idx + 1}.
              </span>
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul key={`ul-${blocks.length}`} className="my-2 space-y-1.5 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-slate-300 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-sm shadow-cyan-400/50" />
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check code fence
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeLang = line.replace('```', '').trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        blocks.push(
          <CodeBlock
            key={`code-${blocks.length}`}
            language={codeLang}
            code={codeLines.join('\n')}
          />
        );
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    // Empty line -> flush list and add spacer
    if (!line) {
      flushList();
      continue;
    }

    // Heading: # H1, ## H2, ### H3, #### H4, or SECTION X:
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const sectionMatch = line.match(/^(SECTION\s+\d+[:\.\-]?\s*.+)$/i);

    if (headingMatch || sectionMatch) {
      flushList();
      const level = headingMatch ? headingMatch[1].length : 2;
      const titleText = headingMatch ? headingMatch[2] : sectionMatch![1];

      if (level === 1 || level === 2) {
        blocks.push(
          <div key={`h-${blocks.length}`} className="mt-3.5 mb-1.5 pb-1 border-b border-slate-800">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
              <span>{titleText}</span>
            </h3>
          </div>
        );
      } else {
        blocks.push(
          <h4
            key={`h-${blocks.length}`}
            className="mt-2.5 mb-1 font-bold text-white text-xs tracking-wide text-slate-100"
          >
            {renderInline(titleText)}
          </h4>
        );
      }
      continue;
    }

    // Unordered list item: * item or - item
    const bulletMatch = line.match(/^[\*\-]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Ordered list item: 1. item or 1) item
    const numberMatch = line.match(/^\d+[\.\)]\s+(.+)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }

    // Regular paragraph line
    flushList();
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-1.5 text-slate-300 leading-relaxed text-xs">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1 font-sans select-text">{blocks}</div>;
};
