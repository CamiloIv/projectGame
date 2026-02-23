/**
 * data.js — Data layer
 *
 * Responsibilities:
 *  - Parse CSV files into pair objects
 *  - Provide demo dataset
 *  - Generate and trigger CSV template download
 *
 * Zero DOM dependencies — purely data transformation.
 */

export const DEMO_PAIRS = [
  { q: '¿Cuál es la capital de Francia?',               a: 'París'               },
  { q: '¿Cuánto es 12 × 12?',                           a: '144'                 },
  { q: '¿Quién escribió "Don Quijote"?',                 a: 'Miguel de Cervantes' },
  { q: '¿En qué año llegó el hombre a la Luna?',         a: '1969'                },
  { q: '¿Cuál es el elemento más abundante en la corteza terrestre?', a: 'Oxígeno' },
  { q: '¿Cuántos huesos tiene el cuerpo humano adulto?', a: '206'                 },
];

const TEMPLATE_CSV = [
  'pregunta,respuesta',
  '¿Cuál es la capital de Francia?,París',
  '¿Cuánto es 12 × 12?,144',
  '¿Quién escribió Don Quijote?,Miguel de Cervantes',
  '¿En qué año llegó el hombre a la Luna?,1969',
  '¿Cuál es el elemento más abundante?,Oxígeno',
].join('\n');

/**
 * Parse a CSV string into [{q, a}] pairs.
 * - Skips the header row if it contains "pregunta" or "question"
 * - Handles commas inside quoted fields
 * - Ignores blank lines
 */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // Detect and skip header
  const firstLower = lines[0].toLowerCase();
  const startIdx = (firstLower.includes('pregunta') || firstLower.includes('question')) ? 1 : 0;

  const pairs = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i]);
    if (parts.length >= 2) {
      const q = parts[0].trim();
      const a = parts.slice(1).join(',').trim();
      if (q && a) pairs.push({ q, a });
    }
  }
  return pairs;
}

/**
 * Basic CSV line splitter that respects double-quoted fields.
 */
function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Trigger a browser download of the CSV template.
 */
export function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'plantilla_matchit.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
