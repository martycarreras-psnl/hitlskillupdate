import { describe, it, expect } from 'vitest';
import {
  inferFieldKind,
  looksLikeDate,
  prettifyKey,
  columnsFromRows,
  blankLike,
  blankRowFromRows,
  toDateInputValue,
} from './fieldInference';

describe('inferFieldKind', () => {
  it('classifies primitives', () => {
    expect(inferFieldKind('hello')).toBe('string');
    expect(inferFieldKind(42)).toBe('number');
    expect(inferFieldKind(true)).toBe('boolean');
    expect(inferFieldKind(null)).toBe('null');
    expect(inferFieldKind(undefined)).toBe('null');
  });

  it('detects date-looking strings', () => {
    expect(inferFieldKind('2026-03-04')).toBe('date');
    expect(inferFieldKind('2026-03-04T10:00:00Z')).toBe('date');
    expect(inferFieldKind('not a date')).toBe('string');
  });

  it('classifies arrays of objects vs primitives', () => {
    expect(inferFieldKind([{ a: 1 }, { a: 2 }])).toBe('array-of-objects');
    expect(inferFieldKind(['a', 'b'])).toBe('array-of-primitives');
    expect(inferFieldKind([1, 2, 3])).toBe('array-of-primitives');
    expect(inferFieldKind([])).toBe('array-of-primitives');
    // mixed → not a clean table
    expect(inferFieldKind([{ a: 1 }, 'x'])).toBe('array-of-primitives');
  });

  it('classifies plain objects', () => {
    expect(inferFieldKind({ company: 'Contoso' })).toBe('object');
  });
});

describe('looksLikeDate', () => {
  it('matches ISO dates and rejects others', () => {
    expect(looksLikeDate('2026-12-31')).toBe(true);
    expect(looksLikeDate('hello')).toBe(false);
    expect(looksLikeDate('12/31/2026')).toBe(false);
  });
});

describe('toDateInputValue', () => {
  it('extracts the yyyy-MM-dd portion', () => {
    expect(toDateInputValue('2026-03-04T10:00:00Z')).toBe('2026-03-04');
    expect(toDateInputValue('2026-03-04')).toBe('2026-03-04');
  });
});

describe('prettifyKey', () => {
  it('humanizes camelCase, snake_case, and kebab-case', () => {
    expect(prettifyKey('invoiceNumber')).toBe('Invoice Number');
    expect(prettifyKey('due_date')).toBe('Due Date');
    expect(prettifyKey('bill-to')).toBe('Bill To');
    expect(prettifyKey('total')).toBe('Total');
  });
});

describe('columnsFromRows', () => {
  it('unions keys preserving first-seen order', () => {
    const rows = [
      { description: 'A', qty: 1 },
      { qty: 2, price: 5 },
    ];
    expect(columnsFromRows(rows)).toEqual(['description', 'qty', 'price']);
  });
});

describe('blankLike / blankRowFromRows', () => {
  it('produces an empty value of the same kind', () => {
    expect(blankLike('x')).toBe('');
    expect(blankLike(5)).toBe(0);
    expect(blankLike(true)).toBe(false);
    expect(blankLike([])).toEqual([]);
    expect(blankLike({})).toEqual({});
  });

  it('builds a blank row matching the column shape', () => {
    const rows = [{ description: 'A', qty: 1, taxable: true }];
    expect(blankRowFromRows(rows)).toEqual({ description: '', qty: 0, taxable: false });
  });
});
