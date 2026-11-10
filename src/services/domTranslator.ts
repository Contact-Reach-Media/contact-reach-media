// Website-Wide DOM Translation Engine
// Walks the document tree and translates all visible text, headers, buttons, placeholders,
// and newly mounted elements dynamically via Google Cloud Translation API proxy.

import { batchTranslateWithGoogle } from './translation.ts';

// Stores original English text for every DOM text node and input element
const originalTextMap = new WeakMap<Node, string>();
const originalPlaceholderMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement, string>();
const originalTitleMap = new WeakMap<HTMLElement, string>();

let activeTargetLang = 'en';
let observer: MutationObserver | null = null;
let isTranslating = false;
let pendingNodes: Node[] = [];
let pendingInputs: (HTMLInputElement | HTMLTextAreaElement)[] = [];
let debounceTimer: any = null;

// Regex to skip purely numeric or code strings
const ONLY_NUMBERS_OR_SYMBOLS = /^[\s\d.,:;!?()[\]{}+/\\$€£¥₹%#@&*|~`'"^_=-]+$/;
const IS_URL = /^https?:\/\//i;
const IS_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isTranslatableText(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 2) return false;
  if (ONLY_NUMBERS_OR_SYMBOLS.test(clean)) return false;
  if (IS_URL.test(clean)) return false;
  if (IS_EMAIL.test(clean)) return false;
  // Has at least some alphabetic letters
  return /[a-zA-Z]/.test(clean);
}

function shouldSkipElement(el: Node | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre' || tag === 'svg' || tag === 'path') {
    return true;
  }
  if (el.classList && (el.classList.contains('notranslate') || el.classList.contains('font-mono'))) {
    // Check if it's purely a code or SKU tag
    if (el.getAttribute('data-notranslate') === 'true') return true;
  }
  return false;
}

/**
 * Scans a subtree and collects untranslated text nodes and placeholders
 */
function collectTranslatableNodes(root: Node): { nodes: Text[]; inputs: (HTMLInputElement | HTMLTextAreaElement)[] } {
  const nodes: Text[] = [];
  const inputs: (HTMLInputElement | HTMLTextAreaElement)[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (shouldSkipElement(node)) return NodeFilter.FILTER_REJECT;
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
          if (node.placeholder && isTranslatableText(node.placeholder)) {
            inputs.push(node);
          }
        }
        return NodeFilter.FILTER_SKIP;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (isTranslatableText(text)) {
          // Verify parent shouldn't be skipped
          if (!shouldSkipElement(node.parentElement)) {
            return NodeFilter.FILTER_ACCEPT;
          }
        }
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_SKIP;
    }
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      nodes.push(currentNode as Text);
    }
    currentNode = walker.nextNode();
  }

  return { nodes, inputs };
}

/**
 * Translates a batch of collected text nodes and inputs
 */
async function processBatchTranslation(nodes: Text[], inputs: (HTMLInputElement | HTMLTextAreaElement)[], targetLang: string) {
  if (targetLang === 'en') return;

  const textPayloads: string[] = [];
  const nodeMap: { node: Text; original: string; index: number }[] = [];
  const inputMap: { input: HTMLInputElement | HTMLTextAreaElement; original: string; index: number }[] = [];

  nodes.forEach(node => {
    // Remember original text if not already stored
    if (!originalTextMap.has(node)) {
      originalTextMap.set(node, node.textContent || '');
    }
    const orig = originalTextMap.get(node) || node.textContent || '';
    if (isTranslatableText(orig)) {
      const idx = textPayloads.length;
      textPayloads.push(orig.trim());
      nodeMap.push({ node, original: orig, index: idx });
    }
  });

  inputs.forEach(input => {
    if (!originalPlaceholderMap.has(input)) {
      originalPlaceholderMap.set(input, input.placeholder || '');
    }
    const orig = originalPlaceholderMap.get(input) || input.placeholder || '';
    if (isTranslatableText(orig)) {
      const idx = textPayloads.length;
      textPayloads.push(orig.trim());
      inputMap.push({ input, original: orig, index: idx });
    }
  });

  if (textPayloads.length === 0) return;

  try {
    const translatedList = await batchTranslateWithGoogle(textPayloads, targetLang, 'en');

    // Apply translations to Text nodes
    nodeMap.forEach(item => {
      const translated = translatedList[item.index];
      if (translated && item.node.isConnected) {
        // Preserve surrounding whitespace
        const leadingSpace = item.original.match(/^\s*/)?.[0] || '';
        const trailingSpace = item.original.match(/\s*$/)?.[0] || '';
        item.node.textContent = `${leadingSpace}${translated}${trailingSpace}`;
      }
    });

    // Apply translations to Input placeholders
    inputMap.forEach(item => {
      const translated = translatedList[item.index];
      if (translated && item.input.isConnected) {
        item.input.placeholder = translated;
      }
    });
  } catch (err) {
    console.warn('[DOMTranslator] Batch translation notice:', err);
  }
}

/**
 * Reverts all translated text nodes and placeholders back to original English
 */
export function restoreOriginalEnglish() {
  activeTargetLang = 'en';

  // Walk through the whole document and restore
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE && originalTextMap.has(currentNode)) {
      const orig = originalTextMap.get(currentNode);
      if (orig !== undefined) {
        currentNode.textContent = orig;
      }
    } else if (
      (currentNode instanceof HTMLInputElement || currentNode instanceof HTMLTextAreaElement) &&
      originalPlaceholderMap.has(currentNode)
    ) {
      const orig = originalPlaceholderMap.get(currentNode);
      if (orig !== undefined) {
        currentNode.placeholder = orig;
      }
    }
    currentNode = walker.nextNode();
  }
}

/**
 * Triggers website-wide translation of the current DOM into the target language
 */
export async function translateCurrentDOM(targetLang: string) {
  activeTargetLang = targetLang;

  if (targetLang === 'en') {
    restoreOriginalEnglish();
    return;
  }

  if (typeof document === 'undefined') return;

  const { nodes, inputs } = collectTranslatableNodes(document.body);
  await processBatchTranslation(nodes, inputs, targetLang);
}

/**
 * Starts the continuous MutationObserver to translate newly mounted elements (modals, new pages, products, etc.)
 */
export function startDOMTranslationObserver(targetLang: string) {
  activeTargetLang = targetLang;

  if (observer) {
    observer.disconnect();
  }

  if (targetLang === 'en') {
    restoreOriginalEnglish();
    return;
  }

  // Initial full document scan
  translateCurrentDOM(targetLang);

  observer = new MutationObserver((mutations) => {
    if (activeTargetLang === 'en') return;

    let newNodesAdded = false;
    const addedNodesList: Node[] = [];

    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && !shouldSkipElement(node)) {
            newNodesAdded = true;
            addedNodesList.push(node);
          }
        });
      }
    }

    if (newNodesAdded) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        addedNodesList.forEach(root => {
          if (root.isConnected) {
            const { nodes, inputs } = collectTranslatableNodes(root);
            if (nodes.length > 0 || inputs.length > 0) {
              processBatchTranslation(nodes, inputs, activeTargetLang);
            }
          }
        });
      }, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
