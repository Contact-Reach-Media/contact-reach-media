import React from 'react';
import { Check, Star, Info, ShieldCheck, Sparkles, Box, Truck } from 'lucide-react';

interface FormattedProductDescriptionProps {
  content: string;
  className?: string;
  compact?: boolean;
}

/**
 * Custom format renderer for product descriptions.
 * Supports Markdown headings, bold, italic, highlights, bullet lists,
 * checkmarked benefit lists, numbered lists, markdown tables, callout boxes,
 * and key-value specs.
 */
export const FormattedProductDescription: React.FC<FormattedProductDescriptionProps> = ({
  content,
  className = '',
  compact = false
}) => {
  if (!content || !content.trim()) {
    return (
      <div className="text-slate-400 italic text-xs py-2">
        No detailed description provided for this product.
      </div>
    );
  }

  // Parse lines and blocks
  const rawText = content.replace(/\r\n/g, '\n');
  const lines = rawText.split('\n');

  // Groups of elements to render
  const renderedElements: React.ReactNode[] = [];
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let currentList: { type: 'bullet' | 'check' | 'numbered'; items: string[] } | null = null;

  const flushTable = (key: string) => {
    if (currentTable) {
      const tableData = currentTable;
      currentTable = null;
      renderedElements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            {tableData.headers.length > 0 && (
              <thead className="bg-slate-100/80 font-bold text-slate-800">
                <tr>
                  {tableData.headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3.5 py-2.5 tracking-wide">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100 bg-white">
              {tableData.rows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className={`px-3.5 py-2 text-slate-700 ${cIdx === 0 ? 'font-semibold text-slate-900 w-1/3' : ''}`}>
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  const flushList = (key: string) => {
    if (currentList) {
      const listData = currentList;
      currentList = null;
      if (listData.type === 'check') {
        renderedElements.push(
          <ul key={key} className="my-2.5 space-y-1.5">
            {listData.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-800 text-xs sm:text-[13px] leading-relaxed">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className="flex-1">{renderInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
      } else if (listData.type === 'numbered') {
        renderedElements.push(
          <ol key={key} className="my-2.5 space-y-1.5">
            {listData.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-800 text-xs sm:text-[13px] leading-relaxed">
                <span className="mt-0.5 px-1.5 py-0.5 rounded-md bg-orange-100 text-[#f95700] text-[10px] font-black shrink-0 font-mono">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="flex-1">{renderInlineFormatting(item)}</span>
              </li>
            ))}
          </ol>
        );
      } else {
        renderedElements.push(
          <ul key={key} className="my-2.5 space-y-1.5">
            {listData.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-800 text-xs sm:text-[13px] leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#f95700] shrink-0" />
                <span className="flex-1">{renderInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Empty line: flush lists and tables
    if (!line) {
      flushList(`list-${i}`);
      flushTable(`table-${i}`);
      continue;
    }

    // Markdown horizontal divider
    if (/^---+$|^\*\*\*+$|^___+$/.test(line)) {
      flushList(`list-${i}`);
      flushTable(`table-${i}`);
      renderedElements.push(<hr key={`hr-${i}`} className="my-3.5 border-slate-200" />);
      continue;
    }

    // Markdown Table Row detection (e.g. | Spec | Detail |)
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList(`list-${i}`);
      // Skip separator row (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        continue;
      }
      const cells = line
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable(`table-${i}`);
    }

    // Checkmarked Benefits List: ✓, ✔, [x], [X], +
    const checkMatch = line.match(/^(?:✓|✔|\[x\]|\[X\]|\+)\s*(.+)$/);
    if (checkMatch) {
      if (!currentList || currentList.type !== 'check') {
        flushList(`list-${i}`);
        currentList = { type: 'check', items: [] };
      }
      currentList.items.push(checkMatch[1]);
      continue;
    }

    // Bulleted List: •, -, * (without subsequent markdown emphasis)
    const bulletMatch = line.match(/^(?:•|-|\*)\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bullet') {
        flushList(`list-${i}`);
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered List: 1., 2., 1), 2)
    const numberedMatch = line.match(/^(?:[0-9]+[\.\)])\s+(.+)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'numbered') {
        flushList(`list-${i}`);
        currentList = { type: 'numbered', items: [] };
      }
      currentList.items.push(numberedMatch[1]);
      continue;
    }

    // If we reach here, it's not a list item, so flush any pending list
    flushList(`list-${i}`);

    // Headings
    if (line.startsWith('# ')) {
      const headingText = line.replace(/^#\s+/, '');
      renderedElements.push(
        <h2 key={`h1-${i}`} className="mt-4 mb-2 text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 border-b border-orange-200/80 pb-1.5">
          <Sparkles className="w-4 h-4 text-[#f95700] shrink-0" />
          <span>{renderInlineFormatting(headingText)}</span>
        </h2>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      const headingText = line.replace(/^##\s+/, '');
      renderedElements.push(
        <h3 key={`h2-${i}`} className="mt-3.5 mb-1.5 text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f95700]" />
          <span>{renderInlineFormatting(headingText)}</span>
        </h3>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      const headingText = line.replace(/^###\s+/, '');
      renderedElements.push(
        <h4 key={`h3-${i}`} className="mt-3 mb-1 text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
          <span>{renderInlineFormatting(headingText)}</span>
        </h4>
      );
      continue;
    }

    // Callout box / blockquote: > text
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s*/, '');
      const isTip = quoteText.includes('💡') || quoteText.toLowerCase().includes('tip');
      const isWarn = quoteText.includes('⚠️') || quoteText.toLowerCase().includes('note') || quoteText.toLowerCase().includes('warning');
      renderedElements.push(
        <div
          key={`quote-${i}`}
          className={`my-2.5 p-3 sm:p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            isWarn
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : isTip
              ? 'bg-orange-50/80 border-orange-200 text-orange-950'
              : 'bg-slate-100/90 border-slate-200 text-slate-800'
          }`}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#f95700]" />
          <div className="flex-1 font-medium">{renderInlineFormatting(quoteText)}</div>
        </div>
      );
      continue;
    }

    // Standard paragraph or key-value pair
    renderedElements.push(
      <p key={`p-${i}`} className="my-1.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal">
        {renderInlineFormatting(line)}
      </p>
    );
  }

  // Flush remaining table or list at end
  flushList('list-final');
  flushTable('table-final');

  return (
    <div className={`formatted-product-description space-y-1 ${compact ? 'text-xs' : 'text-sm'} ${className}`}>
      {renderedElements}
    </div>
  );
};

/**
 * Parses bold (**text** or <b>text</b>), italic (*text* or <i>text</i>),
 * highlight (==text==), inline code (`code`), and badge tags ([badge:Text]).
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  // Split tokens by regex capturing markdown styles
  // Tokens:
  // 1. **bold** or <b>bold</b>
  // 2. *italic* or <i>italic</i>
  // 3. ==highlight==
  // 4. `code`
  // 5. [badge:Label] or [tag:Label]
  const pattern = /(\*\*[^*]+\*\*|<b>[^<]+<\/b>|<strong>[^<]+<\/strong>|\*[^*]+\*|<i>[^<]+<\/i>|==[^=]+==|`[^`]+`|\[badge:[^\]]+\]|\[tag:[^\]]+\])/g;

  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text** or <b>text</b>
    if ((part.startsWith('**') && part.endsWith('**')) ||
        (part.startsWith('<b>') && part.endsWith('</b>')) ||
        (part.startsWith('<strong>') && part.endsWith('</strong>'))) {
      const inner = part
        .replace(/^\*\*/, '')
        .replace(/\*\*$/, '')
        .replace(/^<b>/, '')
        .replace(/<\/b>$/, '')
        .replace(/^<strong>/, '')
        .replace(/<\/strong>$/, '');
      return (
        <strong key={index} className="font-extrabold text-slate-900">
          {inner}
        </strong>
      );
    }

    // Italic: *text* or <i>text</i>
    if ((part.startsWith('*') && part.endsWith('*')) ||
        (part.startsWith('<i>') && part.endsWith('</i>'))) {
      const inner = part
        .replace(/^\*/, '')
        .replace(/\*$/, '')
        .replace(/^<i>/, '')
        .replace(/<\/i>$/, '');
      return (
        <em key={index} className="italic text-slate-800">
          {inner}
        </em>
      );
    }

    // Highlight: ==text==
    if (part.startsWith('==') && part.endsWith('==')) {
      const inner = part.replace(/^==/, '').replace(/==$/, '');
      return (
        <mark key={index} className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-semibold">
          {inner}
        </mark>
      );
    }

    // Code: `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.replace(/^`/, '').replace(/`$/, '');
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-100 text-orange-600 font-mono text-[11px] font-bold border border-slate-200">
          {inner}
        </code>
      );
    }

    // Badge: [badge:Text] or [tag:Text]
    if (part.startsWith('[badge:') || part.startsWith('[tag:')) {
      const inner = part.replace(/^\[(badge|tag):/, '').replace(/\]$/, '');
      return (
        <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#f95700] border border-orange-200 mx-1 align-middle">
          <Sparkles className="w-2.5 h-2.5" />
          {inner}
        </span>
      );
    }

    return part;
  });
}
