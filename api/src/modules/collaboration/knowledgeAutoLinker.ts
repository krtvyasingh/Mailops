/**
 * Module: Automated Knowledge Base Auto-Linker
 * 
 * Automatically identifies matching internal documentation or help center
 * articles and suggests them in the response composer.
 */

export interface ArticleSuggestion {
  articleId: string;
  title: string;
  url: string;
  matchScore: number;
}

export function autoLinkArticles(
  emailBody: string, 
  articles: { id: string; title: string; url: string; keywords: string[] }[]
): ArticleSuggestion[] {
  const bodyLower = emailBody.toLowerCase();
  const suggestions: ArticleSuggestion[] = [];

  for (const article of articles) {
    let score = 0;
    for (const kw of article.keywords) {
      if (bodyLower.includes(kw.toLowerCase())) {
        score += 25;
      }
    }
    if (score > 0) {
      suggestions.push({
        articleId: article.id,
        title: article.title,
        url: article.url,
        matchScore: Math.min(100, score)
      });
    }
  }

  return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
}
