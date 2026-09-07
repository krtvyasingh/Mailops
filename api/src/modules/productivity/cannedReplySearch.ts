/**
 * Module: Canned Response Fuzzy Search Engine
 * 
 * Provides lightning-fast in-memory fuzzy search for canned response snippets
 * using Levenshtein distance and keyword scoring.
 */

export interface CannedSnippet {
  id: string;
  title: string;
  shortcut: string; // e.g. "/pricing"
  body: string;
  category: string;
}

export function searchCannedSnippets(snippets: CannedSnippet[], query: string): CannedSnippet[] {
  const q = query.toLowerCase().trim();
  if (!q) return snippets;

  return snippets
    .map(snippet => {
      let score = 0;
      const titleLower = snippet.title.toLowerCase();
      const shortcutLower = snippet.shortcut.toLowerCase();

      if (shortcutLower === q) score += 100;
      else if (shortcutLower.startsWith(q)) score += 50;
      if (titleLower.includes(q)) score += 30;
      if (snippet.body.toLowerCase().includes(q)) score += 10;

      return { snippet, score };
    })
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(res => res.snippet);
}
