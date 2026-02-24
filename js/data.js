/**
 * data.js — Data layer
 * parseCSV, downloadTemplate, DEMO_PAIRS, DEFAULT_PAIRS
 */

export const DEFAULT_PAIRS = [
  {
    q: "Es el tiempo que transcurre desde que una dirección de memoria es visible para los circuitos de la memoria hasta que el dato está disponible para ser utilizado.",
    a: "Tiempo de Acceso"
  },
  {
    q: "Componente que se coloca como una memoria intermedia entre la memoria principal y el procesador.",
    a: "Memoria Caché"
  },
  {
    q: "Espacio de memoria que se encuentra dentro del procesador, integrado dentro del mismo chip de este.",
    a: "Registro"
  },
  {
    q: "Conjunto de elementos del computador que son visibles desde el punto de vista del programador.",
    a: "Arquitectura de Computador"
  },
  {
    q: "Memorias de capacidad reducida, pero más rápidas que la memoria principal, utilizan acceso asociativo y se pueden encontrar dentro del chip del procesador o cerca de él.",
    a: "Memoria Caché"
  },
  {
    q: "Se organiza como un vector en el que cada elemento individual tiene una dirección única, se accede a una posición determinada proporcionando la dirección.",
    a: "Acceso Aleatorio"
  },
  {
    q: "Se accede desde la última posición a la que se ha accedido, leyendo en orden todas las posiciones hasta llegar a la posición deseada.",
    a: "Acceso Secuencial"
  },
  {
    q: "Sistema de propósito general capaz de hacer operaciones aritméticas y lógicas básicas, a partir de las cuales se pueden resolver problemas complejos.",
    a: "Procesador"
  },
  {
    q: "Organización en bloques donde cada bloque tiene una dirección única; se accede directamente al principio del bloque y dentro de este se hace secuencia hasta llegar a la posición deseada.",
    a: "Acceso Directo"
  },
  {
    q: "Se refiere a las unidades funcionales del computador y cómo están interconectadas.",
    a: "Estructura de Computador"
  },
  {
    q: "Necesita de una corriente eléctrica para mantener su estado. Incluyen registros, memoria caché y memoria principal.",
    a: "Memoria Volátil"
  },
];

export const DEMO_PAIRS = DEFAULT_PAIRS;

const TEMPLATE_CSV = [
  'pregunta,respuesta',
  '¿Cuál es la capital de Francia?,París',
  '¿Cuánto es 12 × 12?,144',
  '¿Quién escribió Don Quijote?,Miguel de Cervantes',
  '¿En qué año llegó el hombre a la Luna?,1969',
  '¿Cuál es el elemento más abundante?,Oxígeno',
].join('\n');

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

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

function splitCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

export function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'plantilla_matchit.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}