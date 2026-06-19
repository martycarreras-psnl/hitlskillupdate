// Pure helpers that infer a UI control from the runtime shape of a JSON value.
// Used by the Dynamic Field Editor (ADR 0004). Kept free of React so the inference
// rules can be unit-tested in isolation.

export type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array-of-objects'
  | 'array-of-primitives'
  | 'null';

// Matches an ISO-ish date or date-time string (e.g. 2026-03-01 or 2026-03-01T10:00:00Z).
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;

/** Best-effort detection of a date-looking string. */
export function looksLikeDate(value: string): boolean {
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return false;
  return !Number.isNaN(Date.parse(trimmed));
}

/** Extract the yyyy-MM-dd portion of a date-looking string for an <input type="date">. */
export function toDateInputValue(value: string): string {
  return value.trim().slice(0, 10);
}

/** Infer which control should render a given JSON value. */
export function inferFieldKind(value: unknown): FieldKind {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return looksLikeDate(value) ? 'date' : 'string';
  if (Array.isArray(value)) {
    const objectRows = value.filter(
      (item) => item !== null && typeof item === 'object' && !Array.isArray(item),
    );
    // Treat as a table only when every element is a plain object.
    if (value.length > 0 && objectRows.length === value.length) return 'array-of-objects';
    return 'array-of-primitives';
  }
  if (typeof value === 'object') return 'object';
  return 'string';
}

/** Turn a JSON key (camelCase / snake_case / kebab-case) into a Title Case label. */
export function prettifyKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return spaced
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Union of keys across an array of row objects, preserving first-seen order. */
export function columnsFromRows(rows: Array<Record<string, unknown>>): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

/** Produce an empty value of the same kind as the supplied value. */
export function blankLike(value: unknown): unknown {
  switch (inferFieldKind(value)) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array-of-objects':
    case 'array-of-primitives':
      return [];
    case 'object':
      return {};
    case 'date':
    case 'string':
    case 'null':
    default:
      return '';
  }
}

/** Build a blank row matching the column shape of existing rows in a table. */
export function blankRowFromRows(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  const sample = rows[0] ?? {};
  const row: Record<string, unknown> = {};
  for (const key of columnsFromRows(rows)) {
    row[key] = blankLike(sample[key]);
  }
  return row;
}
