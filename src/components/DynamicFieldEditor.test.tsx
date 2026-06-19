import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../tests/setup/test-utils';
import { DynamicFieldEditor } from './DynamicFieldEditor';
import type { ExtractedData } from '@/types/domain-models';

// A stateful harness so edits round-trip through onChange like a real consumer.
function Harness({ initial, readOnly }: { initial: ExtractedData; readOnly?: boolean }) {
  const [value, setValue] = useState<ExtractedData>(initial);
  return (
    <>
      <DynamicFieldEditor value={value} onChange={readOnly ? undefined : setValue} readOnly={readOnly} />
      <pre data-testid="state">{JSON.stringify(value)}</pre>
    </>
  );
}

// Harness that supplies a fixed `original` snapshot so changed fields highlight green.
function HighlightHarness({ initial }: { initial: ExtractedData }) {
  const [value, setValue] = useState<ExtractedData>(initial);
  return <DynamicFieldEditor value={value} original={initial} onChange={setValue} />;
}

const receipt: ExtractedData = {
  merchant: 'Blue Bottle',
  total: 20.12,
  reimbursable: true,
  date: '2026-03-04',
  items: [{ description: 'Cappuccino', qty: 2 }],
};

const invoice: ExtractedData = {
  vendor: 'Northwind',
  invoiceNumber: 'NW-1',
  billTo: { company: 'Contoso' },
  lineItems: [
    { sku: 'A', qty: 1 },
    { sku: 'B', qty: 2 },
  ],
};

describe('DynamicFieldEditor — inference', () => {
  it('renders inferred controls for a receipt payload', () => {
    render(<Harness initial={receipt} />);

    // string → textbox, prettified label
    expect(screen.getByLabelText('Merchant')).toBeTruthy();
    // boolean → switch
    expect(screen.getByRole('switch', { name: 'Reimbursable' })).toBeTruthy();
    // array-of-objects → table with prettified column headers
    expect(screen.getByText('Items')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('Qty')).toBeTruthy();
  });

  it('renders a nested object as a collapsible section for an invoice payload', () => {
    render(<Harness initial={invoice} />);
    expect(screen.getByText('Bill To')).toBeTruthy();
    expect(screen.getByLabelText('Company')).toBeTruthy();
    expect(screen.getByText('Line Items')).toBeTruthy();
  });

  it('never renders raw JSON', () => {
    const { container } = render(<DynamicFieldEditor value={receipt} readOnly />);
    expect(container.textContent).not.toContain('"merchant"');
    expect(container.textContent).not.toContain('{"');
  });
});

describe('DynamicFieldEditor — round-trip edits', () => {
  it('writes string edits back into the JSON', () => {
    render(<Harness initial={receipt} />);
    const input = screen.getByLabelText('Merchant') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Stumptown' } });
    expect(screen.getByTestId('state').textContent).toContain('"merchant":"Stumptown"');
  });

  it('coerces numeric edits to numbers', () => {
    render(<Harness initial={receipt} />);
    const input = screen.getByLabelText('Total') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '99' } });
    expect(screen.getByTestId('state').textContent).toContain('"total":99');
  });

  it('toggles boolean values', () => {
    render(<Harness initial={receipt} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Reimbursable' }));
    expect(screen.getByTestId('state').textContent).toContain('"reimbursable":false');
  });

  it('adds a row to an array-of-objects table', () => {
    render(<Harness initial={receipt} />);
    expect(screen.getByTestId('state').textContent).toContain('"items":[{"description":"Cappuccino","qty":2}]');
    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    // A blank row matching the column shape is appended.
    expect(screen.getByTestId('state').textContent).toContain('{"description":"","qty":0}');
  });

  it('removes a row from an array-of-objects table', () => {
    render(<Harness initial={invoice} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove row 1' }));
    const state = screen.getByTestId('state').textContent ?? '';
    expect(state).not.toContain('"sku":"A"');
    expect(state).toContain('"sku":"B"');
  });
});

describe('DynamicFieldEditor — read-only mode', () => {
  it('disables inputs and hides editing affordances', () => {
    render(<Harness initial={receipt} readOnly />);
    const input = screen.getByLabelText('Merchant') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Add row' })).toBeNull();
  });
});

describe('DynamicFieldEditor — changed-field highlight', () => {
  it('marks a field changed only after its value differs from the original', () => {
    render(<HighlightHarness initial={receipt} />);
    const merchant = screen.getByLabelText('Merchant') as HTMLInputElement;

    // Unchanged at first.
    expect(merchant.getAttribute('data-changed')).toBeNull();

    // Editing flags it as changed (green highlight).
    fireEvent.change(merchant, { target: { value: 'Stumptown' } });
    expect(screen.getByLabelText('Merchant').getAttribute('data-changed')).toBe('true');

    // Reverting back to the original clears the highlight.
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Blue Bottle' } });
    expect(screen.getByLabelText('Merchant').getAttribute('data-changed')).toBeNull();
  });

  it('does not highlight a field the reviewer has not touched', () => {
    render(<HighlightHarness initial={receipt} />);
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Stumptown' } });
    // Total was not edited, so it stays unhighlighted.
    expect(screen.getByLabelText('Total').getAttribute('data-changed')).toBeNull();
  });

  it('does not highlight in read-only mode (no original supplied)', () => {
    render(<Harness initial={receipt} readOnly />);
    expect(screen.getByLabelText('Merchant').getAttribute('data-changed')).toBeNull();
  });
});
