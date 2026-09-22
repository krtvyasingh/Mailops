/**
 * Module: Lucene-Style Smart Search Query Parser
 * 
 * Parses rich search syntax queries like:
 * "from:alice@example.com has:attachment before:2026-09-01 is:unread invoice"
 * into a structured SQL AST filter.
 */

export interface ParsedSearchQuery {
  rawQuery: string;
  freeTextKeywords: string[];
  filters: {
    from?: string;
    to?: string;
    subject?: string;
    hasAttachment?: boolean;
    isUnread?: boolean;
    isStarred?: boolean;
    beforeDate?: Date;
    afterDate?: Date;
    minSizeBytes?: number;
    category?: string;
  };
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    rawQuery: query,
    freeTextKeywords: [],
    filters: {}
  };

  const tokens = query.trim().split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith('from:')) {
      result.filters.from = token.substring(5).toLowerCase();
    } else if (token.startsWith('to:')) {
      result.filters.to = token.substring(3).toLowerCase();
    } else if (token.startsWith('subject:')) {
      result.filters.subject = token.substring(8);
    } else if (token === 'has:attachment') {
      result.filters.hasAttachment = true;
    } else if (token === 'is:unread') {
      result.filters.isUnread = true;
    } else if (token === 'is:starred') {
      result.filters.isStarred = true;
    } else if (token.startsWith('before:')) {
      const d = new Date(token.substring(7));
      if (!isNaN(d.getTime())) result.filters.beforeDate = d;
    } else if (token.startsWith('after:')) {
      const d = new Date(token.substring(6));
      if (!isNaN(d.getTime())) result.filters.afterDate = d;
    } else if (token.startsWith('category:')) {
      result.filters.category = token.substring(9).toLowerCase();
    } else {
      result.freeTextKeywords.push(token);
    }
  }

  return result;
}

export function buildSqlWhereClause(parsed: ParsedSearchQuery): { sql: string; params: any[] } {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];

  if (parsed.filters.from) {
    conditions.push('LOWER(from_addr) LIKE ?');
    params.push(`%${parsed.filters.from}%`);
  }
  if (parsed.filters.to) {
    conditions.push('LOWER(to_addr) LIKE ?');
    params.push(`%${parsed.filters.to}%`);
  }
  if (parsed.filters.subject) {
    conditions.push('LOWER(subject) LIKE ?');
    params.push(`%${parsed.filters.subject.toLowerCase()}%`);
  }
  if (parsed.filters.isUnread) {
    conditions.push('is_read = 0');
  }
  if (parsed.filters.beforeDate) {
    conditions.push('created_at < ?');
    params.push(parsed.filters.beforeDate.getTime());
  }
  if (parsed.filters.afterDate) {
    conditions.push('created_at > ?');
    params.push(parsed.filters.afterDate.getTime());
  }
  if (parsed.freeTextKeywords.length > 0) {
    const textQuery = parsed.freeTextKeywords.join(' ');
    conditions.push('(LOWER(subject) LIKE ? OR LOWER(text_body) LIKE ?)');
    params.push(`%${textQuery.toLowerCase()}%`, `%${textQuery.toLowerCase()}%`);
  }

  return {
    sql: conditions.join(' AND '),
    params
  };
}
