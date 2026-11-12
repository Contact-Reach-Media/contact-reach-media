import React, { useState, useRef } from 'react';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Table as TableIcon, Quote, Sparkles, Box, Truck, Eye, Edit3,
  HelpCircle, ChevronDown, RotateCcw
} from 'lucide-react';
import { FormattedProductDescription } from './FormattedProductDescription.tsx';

interface ProductDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export const ProductDescriptionEditor: React.FC<ProductDescriptionEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write a comprehensive custom-formatted product description...',
  rows = 7
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to wrap selected text or insert markup at cursor
  const insertMarkup = (before: string, after: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value}\n${before}${defaultPlaceholder}${after}` : `${before}${defaultPlaceholder}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    const selectedText = currentText.substring(start, end);
    const textToInsert = selectedText ? selectedText : defaultPlaceholder;
    const newText = currentText.substring(0, start) + before + textToInsert + after + currentText.substring(end);

    onChange(newText);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 20);
  };

  // Helper to insert a block at cursor on a new line
  const insertBlock = (blockText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value}\n\n${blockText}` : blockText);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    const needsNewlineBefore = start > 0 && currentText[start - 1] !== '\n';
    const prefix = needsNewlineBefore ? '\n\n' : '';
    const newText = currentText.substring(0, start) + prefix + blockText + '\n' + currentText.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + blockText.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 20);
  };

  // Quick Templates
  const applyTemplate = (templateType: 'highlights' | 'specs' | 'box' | 'delivery' | 'full') => {
    setShowTemplatesDropdown(false);

    if (templateType === 'highlights') {
      insertBlock(
`### 🌟 Key Highlights & Benefits
✓ Premium build quality designed for daily reliability
✓ Fast high-performance efficiency with extended durability
✓ Sleek modern aesthetics that match any setting
✓ 100% verified authentic product with official warranty`
      );
    } else if (templateType === 'specs') {
      insertBlock(
`### 📋 Technical Specifications
| Specification | Details |
| Model & Series | Professional Grade |
| Primary Material | Reinforced Aluminum & Eco-friendly Polymer |
| Compatibility | Universal / Multi-platform |
| Colorway | Matte Finish |
| Weight & Form | Lightweight Ergonomic Design |`
      );
    } else if (templateType === 'box') {
      insertBlock(
`### 📦 What's In The Box
• 1x Main Product Unit
• 1x Quick-Start User Manual & Documentation
• 1x Original Protective Retail Packaging`
      );
    } else if (templateType === 'delivery') {
      insertBlock(
`### 🚚 Delivery & Warranty Information
• **Fast Delivery**: Same-day or next-day dispatch within Kigali
• **Upcountry Shipping**: Prompt, secure delivery to all districts in Rwanda
• **Customer Protection**: 7-day inspection guarantee with direct customer care`
      );
    } else if (templateType === 'full') {
      const fullTemplate = 
`**Overview:**
A top-tier solution crafted for performance, elegance, and peace of mind. Ideal for both professional and everyday personal use.

### 🌟 Key Highlights & Benefits
✓ Premium build quality designed for daily reliability
✓ Fast high-performance efficiency with extended durability
✓ Sleek modern aesthetics that match any setting
✓ 100% verified authentic product with official warranty

### 📋 Technical Specifications
| Specification | Details |
| Model & Series | Professional Edition |
| Primary Material | Premium Grade Composite |
| Dimensions | Standard Fit |
| Certification | Quality Inspected & Certified |

### 📦 What's In The Box
• 1x Main Product Unit
• 1x Quick-Start User Manual & Documentation
• 1x Protective Retail Packaging

> 💡 **Special Note**: For best performance, inspect items upon delivery. Contact Reach customer support is available 24/7 via WhatsApp (0780022600).`;
      onChange(fullTemplate);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-2xs transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10">
      {/* Top Bar: Tabs & Action Buttons */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-white text-orange-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Format Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-white text-orange-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Customer Live Preview</span>
          </button>
        </div>

        {/* Quick Format Templates & Help */}
        <div className="flex items-center gap-1.5 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
              className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[#f95700] text-xs font-black flex items-center gap-1 transition-colors cursor-pointer border border-orange-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#f95700]" />
              <span>Insert Template</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showTemplatesDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Quick Description Sections
                </div>
                <button
                  type="button"
                  onClick={() => applyTemplate('highlights')}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>🌟 Key Highlights (Checkmarks)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('specs')}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <TableIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>📋 Specifications Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('box')}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Box className="w-3.5 h-3.5 text-emerald-500" />
                  <span>📦 What's In The Box</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('delivery')}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Truck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>🚚 Delivery & Warranty Policy</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => applyTemplate('full')}
                  className="w-full px-3 py-1.5 text-left text-orange-600 hover:bg-orange-50 flex items-center gap-2 cursor-pointer font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>✨ Insert Complete Formatted Layout</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            title="Formatting Guide"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar (Visible in Edit Mode) */}
      {activeTab === 'edit' && (
        <div className="bg-slate-50/60 border-b border-slate-200 px-2.5 py-1.5 flex flex-wrap items-center gap-1 text-slate-700">
          <button
            type="button"
            onClick={() => insertMarkup('**', '**', 'Bold text')}
            title="Bold (**text**)"
            className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkup('*', '*', 'Italic text')}
            title="Italic (*text*)"
            className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => insertBlock('## Section Title')}
            title="Heading 2 (## Section Title)"
            className="px-2 py-1 rounded text-[11px] font-black hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('### Subheading')}
            title="Heading 3 (### Subheading)"
            className="px-2 py-1 rounded text-[11px] font-bold hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => insertBlock('• First bullet point\n• Second bullet point')}
            title="Bullet list (• Item)"
            className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <List className="w-3.5 h-3.5 text-[#f95700]" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('✓ Feature or key benefit\n✓ Verified authentic quality')}
            title="Checkmark benefits list (✓ Item)"
            className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('1. First step or feature\n2. Second step or feature')}
            title="Numbered list (1. Item)"
            className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => insertBlock('| Feature | Detail |\n|---|---|\n| Material | Premium Grade |\n| Color | Matte Black |')}
            title="Table (| Col 1 | Col 2 |)"
            className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <TableIcon className="w-3.5 h-3.5 text-blue-600" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('> 💡 **Tip:** Handle with care and store in a cool dry place.')}
            title="Callout Box (> Note)"
            className="p-1.5 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Quote className="w-3.5 h-3.5 text-amber-600" />
          </button>
          <button
            type="button"
            onClick={() => insertMarkup('[badge:', ']', 'NEW ARRIVAL')}
            title="Badge ([badge:Label])"
            className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer"
          >
            + Badge
          </button>
          <button
            type="button"
            onClick={() => insertBlock('---')}
            title="Horizontal Divider"
            className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ---
          </button>
        </div>
      )}

      {/* Formatting Help Quick Sheet */}
      {showHelp && (
        <div className="bg-orange-50/70 border-b border-orange-200 p-3 text-xs text-slate-700 space-y-1.5">
          <div className="font-black text-orange-900 flex items-center justify-between">
            <span>✨ Custom Format Guide</span>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-orange-700 hover:text-orange-950 font-bold"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-[11px] text-slate-600">
            You can combine headings, bullet lists, checkmarks, tables, and callouts to make your product descriptions look modern and professional on the customer storefront:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-white p-2.5 rounded-lg border border-orange-200">
            <div><span className="text-orange-600 font-bold">**Bold text**</span></div>
            <div><span className="text-emerald-600 font-bold">✓ Benefit point</span></div>
            <div><span className="text-blue-600 font-bold">### Section Heading</span></div>
            <div><span className="text-indigo-600 font-bold">| Col 1 | Col 2 |</span></div>
          </div>
        </div>
      )}

      {/* Main Body: Textarea OR Live Preview */}
      {activeTab === 'edit' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3.5 py-3 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none resize-y font-mono leading-relaxed bg-white"
          />
        </div>
      ) : (
        <div className="p-4 bg-slate-50/80 min-h-[180px] max-h-[400px] overflow-y-auto">
          <div className="mb-2 pb-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-orange-600" />
              Live Storefront Preview
            </span>
            <span className="text-[10px] text-slate-400">
              {value.trim().length > 0 ? `${value.trim().split(/\s+/).length} words` : 'Empty'}
            </span>
          </div>
          <FormattedProductDescription content={value} />
        </div>
      )}

      {/* Bottom Footer Info */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="hidden sm:inline">Supports Markdown headings, styled tables, badges, and checkmarks</span>
        <span className="ml-auto font-mono text-[10px]">
          {value ? `${value.length} characters` : '0 characters'}
        </span>
      </div>
    </div>
  );
};
