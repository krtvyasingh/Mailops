/**
 * Feature 15: Templates & Canned Responses
 * Pure TypeScript dynamic placeholder variable interpolation engine with filters,
 * shortcut expansion, and canned response registry with ZERO external dependencies.
 */
/**
 * Resolves a nested property path from an object (e.g. "recipient.profile.name").
 */
export function resolvePath(obj, path) {
    if (!obj || typeof obj !== 'object')
        return undefined;
    if (!path)
        return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
            return undefined;
        }
        if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, part)) {
            // nosemgrep: javascript.lang.security.audit.prototype-pollution.prototype-pollution-loop.prototype-pollution-loop
            current = current[part];
        }
        else {
            return undefined;
        }
    }
    return current;
}
/**
 * Parses placeholder expressions into AST variables.
 * Format examples:
 * - `{{name}}`
 * - `{{user.name | uppercase}}`
 * - `{{sender.company | default: 'Acme Corp'}}`
 * - `{{date | format: 'YYYY-MM-DD'}}`
 */
export function parsePlaceholder(rawTag) {
    const match = rawTag.match(/^\{\{\s*([\s\S]+?)\s*\}\}$/);
    if (!match)
        return null;
    const inner = match[1].trim();
    const pipeParts = inner.split('|').map((s) => s.trim());
    const mainExpr = pipeParts[0];
    const filterParts = pipeParts.slice(1);
    let key = mainExpr;
    let defaultValue = undefined;
    // Check inline default e.g. "name || 'Friend'"
    if (mainExpr.includes('||')) {
        const [k, d] = mainExpr.split('||').map((s) => s.trim());
        key = k;
        defaultValue = d.replace(/^['"]|['"]$/g, '');
    }
    const filters = [];
    for (const fp of filterParts) {
        if (fp.startsWith('default:')) {
            defaultValue = fp.substring(8).trim().replace(/^['"]|['"]$/g, '');
            continue;
        }
        const colonIdx = fp.indexOf(':');
        if (colonIdx !== -1) {
            const filterName = fp.substring(0, colonIdx).trim().toLowerCase();
            const argStr = fp.substring(colonIdx + 1).trim();
            const args = argStr
                .split(',')
                .map((a) => a.trim().replace(/^['"]|['"]$/g, ''));
            filters.push({ name: filterName, args });
        }
        else {
            filters.push({ name: fp.toLowerCase(), args: [] });
        }
    }
    return {
        raw: rawTag,
        key,
        defaultValue,
        filters,
    };
}
/**
 * Applies a filter pipeline to a string value.
 */
export function applyFilters(val, filters, context) {
    let result = val;
    for (const filter of filters) {
        switch (filter.name) {
            case 'uppercase':
            case 'upper':
                result = result.toUpperCase();
                break;
            case 'lowercase':
            case 'lower':
                result = result.toLowerCase();
                break;
            case 'capitalize':
            case 'cap':
                result = result.replace(/\b\w/g, (c) => c.toUpperCase());
                break;
            case 'trim':
                result = result.trim();
                break;
            case 'date_format':
            case 'format': {
                const fmt = filter.args[0] || 'YYYY-MM-DD';
                const d = new Date(result || Date.now());
                if (!isNaN(d.getTime())) {
                    const yyyy = String(d.getFullYear());
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hh = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    result = fmt
                        .replace('YYYY', yyyy)
                        .replace('MM', mm)
                        .replace('DD', dd)
                        .replace('HH', hh)
                        .replace('mm', min);
                }
                break;
            }
            default:
                break;
        }
    }
    return result;
}
/**
 * Extracts all unique placeholder variables found in a template string.
 */
export function extractPlaceholders(templateText) {
    if (!templateText)
        return [];
    const regex = /\{\{[\s\S]+?\}\}/g;
    const matches = templateText.match(regex) || [];
    const vars = [];
    const seen = new Set();
    for (const m of matches) {
        const parsed = parsePlaceholder(m);
        if (parsed && !seen.has(parsed.raw)) {
            seen.add(parsed.raw);
            vars.push(parsed);
        }
    }
    return vars;
}
/**
 * Interpolates dynamic variables into a template string given a context object.
 */
export function interpolateString(templateText, context = {}) {
    if (!templateText) {
        return { text: '', missing: [], resolved: {} };
    }
    const vars = extractPlaceholders(templateText);
    let result = templateText;
    const missing = [];
    const resolved = {};
    // Auto-inject common contextual defaults if not provided
    const mergedContext = {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        year: new Date().getFullYear(),
        ...context,
    };
    for (const v of vars) {
        const val = resolvePath(mergedContext, v.key);
        let strVal;
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            strVal = String(val);
            strVal = applyFilters(strVal, v.filters, mergedContext);
            resolved[v.key] = strVal;
        }
        else if (v.defaultValue !== undefined) {
            strVal = applyFilters(v.defaultValue, v.filters, mergedContext);
            resolved[v.key] = strVal;
        }
        else {
            missing.push(v.key);
            strVal = ''; // Or leave placeholder intact or blank
        }
        result = result.split(v.raw).join(strVal);
    }
    return { text: result, missing, resolved };
}
/**
 * Renders a full CannedTemplate (subject and body).
 */
export function renderTemplate(template, context = {}) {
    const bodyRender = interpolateString(template.body, context);
    let subjectRender;
    if (template.subject) {
        subjectRender = interpolateString(template.subject, context);
    }
    const allMissing = Array.from(new Set([...bodyRender.missing, ...(subjectRender?.missing || [])]));
    const allResolved = { ...bodyRender.resolved, ...(subjectRender?.resolved || {}) };
    return {
        subject: subjectRender?.text,
        body: bodyRender.text,
        missingVariables: allMissing,
        resolvedVariables: allResolved,
    };
}
/**
 * Canned Templates Registry
 */
export class TemplateManager {
    templates = new Map();
    constructor(initial) {
        if (initial) {
            for (const t of initial) {
                this.templates.set(t.id, { ...t });
            }
        }
    }
    register(template) {
        const id = template.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = Date.now();
        const item = {
            ...template,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.templates.set(id, item);
        return item;
    }
    get(id) {
        const t = this.templates.get(id);
        return t ? { ...t } : undefined;
    }
    getByShortcut(shortcutKey) {
        const cleanKey = shortcutKey.trim().toLowerCase();
        for (const t of this.templates.values()) {
            if (t.shortcutKey && t.shortcutKey.trim().toLowerCase() === cleanKey) {
                return { ...t };
            }
        }
        return undefined;
    }
    search(query, category) {
        const q = query.toLowerCase().trim();
        let list = Array.from(this.templates.values());
        if (category) {
            list = list.filter((t) => t.category?.toLowerCase() === category.toLowerCase());
        }
        if (!q)
            return list;
        return list.filter((t) => {
            return (t.title.toLowerCase().includes(q) ||
                (t.shortcutKey && t.shortcutKey.toLowerCase().includes(q)) ||
                (t.subject && t.subject.toLowerCase().includes(q)) ||
                t.body.toLowerCase().includes(q));
        });
    }
    delete(id) {
        return this.templates.delete(id);
    }
    list() {
        return Array.from(this.templates.values());
    }
    clear() {
        this.templates.clear();
    }
}
