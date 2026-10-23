import { describe, expect, it } from 'vitest';
// @ts-expect-error The Tailwind config is plain JavaScript and has no type declarations.
import tailwind from '../../tailwind.config.js';

// Every component source, as text.
const sources = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('orange palette classes', () => {
  it('only use shades the palette defines, so a dark: style is never silently dropped', () => {
    const shades = new Set(Object.keys(tailwind.theme.extend.colors.primary));
    const missing: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
      for (const match of text.matchAll(/\b(?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|accent|caret|decoration|shadow)-primary-(\d+)/g)) {
        if (!shades.has(match[1])) missing.push(`${file}: ${match[0]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
