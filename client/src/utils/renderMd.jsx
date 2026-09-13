/**
 * renderMd.jsx
 *
 * Lightweight inline-markdown renderer — no external library needed.
 * Handles the subset that Mistral consistently produces:
 *   **bold**  →  <strong>
 *   *italic*  →  <em>
 *   `code`    →  <code>
 *
 * Returns a React fragment with real <strong>/<em>/<code> elements so
 * the browser renders them correctly instead of showing raw asterisks.
 *
 * Usage:
 *   import { renderMd } from '../utils/renderMd.jsx';
 *   <p>{renderMd(text)}</p>
 *   <span>{renderMd(item)}</span>
 */

// Tokenise a string into plain-text runs and inline-markdown spans.
// Pattern order matters: longest delimiter first (** before *).
const INLINE_RE = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;

export function renderMd(text) {
  if (!text) return '';
  if (typeof text !== 'string') {
    if (typeof text === 'object') {
      const primaryKeys = ['threat', 'risk', 'tip', 'strategy', 'action', 'recommendation', 'advice', 'milestone', 'title', 'point', 'name', 'text', 'detail', 'description'];
      for (const k of primaryKeys) {
        if (typeof text[k] === 'string' && text[k].trim()) return renderMd(text[k]);
      }
      const vals = Object.values(text).filter(v => typeof v === 'string' || typeof v === 'number');
      if (vals.length > 0) return vals.join(' — ');
      return JSON.stringify(text);
    }
    text = String(text);
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  INLINE_RE.lastIndex = 0; // reset stateful regex

  while ((match = INLINE_RE.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      // `code`
      parts.push(<code key={key++}>{match[6]}</code>);
    }

    lastIndex = INLINE_RE.lastIndex;
  }

  // Push any remaining plain text after the last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}
