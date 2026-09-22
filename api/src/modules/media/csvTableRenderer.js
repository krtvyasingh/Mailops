/**
 * Module: Interactive CSV and Spreadsheet Table Renderer
 *
 * Parses attached CSV, TSV, and delimited spreadsheet files into interactive
 * sortable table structures with pure TypeScript zero-dependency parsing.
 */
export function parseCSV(csvContent, delimiter = ',') {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
        return { headers: [], rows: [], rowCount: 0, columnCount: 0 };
    }
    const parseLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === delimiter && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            }
            else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        return values;
    };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
    return {
        headers,
        rows,
        rowCount: rows.length,
        columnCount: headers.length
    };
}
