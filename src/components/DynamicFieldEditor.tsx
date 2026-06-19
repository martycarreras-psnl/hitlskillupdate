// Dynamic Field Editor — the centerpiece. Renders Extracted Data as Fluent UI v9
// controls inferred from each JSON value's runtime shape, and writes edits back into
// the JSON object. The raw JSON is NEVER displayed. Supports a read-only mode. (ADR 0004.)

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  Field,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Add16Regular, Delete16Regular } from '@fluentui/react-icons';
import type { ExtractedData } from '@/types/domain-models';
import {
  blankRowFromRows,
  columnsFromRows,
  inferFieldKind,
  prettifyKey,
  toDateInputValue,
} from '@/utils/fieldInference';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  nested: {
    borderLeftStyle: 'solid',
    borderLeftWidth: '2px',
    borderLeftColor: tokens.colorNeutralStroke2,
    paddingLeft: tokens.spacingHorizontalM,
  },
  arrayItem: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
  },
  arrayItemControl: {
    flexGrow: 1,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  rowActions: {
    width: '48px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: tokens.spacingVerticalXS,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
  // Applied to a leaf control whose value differs from the agent's original value, so
  // a reviewer can see at a glance which fields they changed during validation.
  changedControl: {
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: `0 0 0 2px ${tokens.colorPaletteGreenBorder2}`,
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
});

type Json = unknown;

/** Leaf-value equality. Treats null/undefined as equal so an absent original
 * doesn't read as "changed" when the value is also empty. */
function leafEqual(a: Json, b: Json): boolean {
  if (a == null && b == null) return true;
  return a === b;
}

interface ControlProps {
  value: Json;
  onChange: (next: Json) => void;
  readOnly?: boolean;
  ariaLabel?: string;
  /** The agent's original value at this position, used to highlight reviewer edits. */
  originalValue?: Json;
  /** Whether change-highlighting is active (review mode, not read-only). */
  highlight?: boolean;
}

// ── Single value → control ────────────────────────────────────────────────────

function ValueControl({ value, onChange, readOnly, ariaLabel, originalValue, highlight }: ControlProps) {
  const styles = useStyles();
  const kind = inferFieldKind(value);
  const isLeaf = kind === 'boolean' || kind === 'number' || kind === 'date' || kind === 'string' || kind === 'null';
  const changed = Boolean(highlight) && !readOnly && isLeaf && !leafEqual(value, originalValue);
  const changedClass = changed ? styles.changedControl : undefined;
  const changedAttr = changed ? 'true' : undefined;

  switch (kind) {
    case 'boolean':
      return (
        <Switch
          checked={Boolean(value)}
          disabled={readOnly}
          aria-label={ariaLabel}
          className={changedClass}
          data-changed={changedAttr}
          onChange={(_e, data) => onChange(data.checked)}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={String(value ?? '')}
          disabled={readOnly}
          aria-label={ariaLabel}
          className={changedClass}
          data-changed={changedAttr}
          onChange={(_e, data) => {
            const n = Number(data.value);
            onChange(data.value === '' || Number.isNaN(n) ? 0 : n);
          }}
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          value={toDateInputValue(String(value ?? ''))}
          disabled={readOnly}
          aria-label={ariaLabel}
          className={changedClass}
          data-changed={changedAttr}
          onChange={(_e, data) => onChange(data.value)}
        />
      );
    case 'object':
      return (
        <div className={styles.nested}>
          <ObjectFields
            value={(value ?? {}) as ExtractedData}
            original={originalValue as ExtractedData | undefined}
            highlight={highlight}
            onChange={(next) => onChange(next)}
            readOnly={readOnly}
          />
        </div>
      );
    case 'array-of-objects':
      return (
        <ObjectArrayTable
          rows={(value as Array<Record<string, unknown>>) ?? []}
          originalRows={(originalValue as Array<Record<string, unknown>> | undefined)}
          highlight={highlight}
          onChange={(next) => onChange(next)}
          readOnly={readOnly}
        />
      );
    case 'array-of-primitives':
      return (
        <PrimitiveArrayEditor
          items={(value as Json[]) ?? []}
          originalItems={(originalValue as Json[] | undefined)}
          highlight={highlight}
          onChange={(next) => onChange(next)}
          readOnly={readOnly}
        />
      );
    case 'null':
    case 'string':
    default:
      return (
        <Input
          value={value == null ? '' : String(value)}
          disabled={readOnly}
          aria-label={ariaLabel}
          className={changedClass}
          data-changed={changedAttr}
          onChange={(_e, data) => onChange(data.value)}
        />
      );
  }
}

// ── Object → labeled fields ────────────────────────────────────────────────────

function ObjectFields({
  value,
  onChange,
  readOnly,
  original,
  highlight,
}: {
  value: ExtractedData;
  onChange: (next: ExtractedData) => void;
  readOnly?: boolean;
  original?: ExtractedData;
  highlight?: boolean;
}) {
  const styles = useStyles();
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return <Text className={styles.empty}>No fields.</Text>;
  }

  function setKey(key: string, next: Json) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className={styles.root}>
      {entries.map(([key, val]) => {
        const label = prettifyKey(key);
        const kind = inferFieldKind(val);
        const childOriginal = original?.[key];

        // Nested objects and arrays-of-objects get a collapsible section.
        if (kind === 'object' || kind === 'array-of-objects') {
          return (
            <Accordion key={key} collapsible defaultOpenItems={[key]}>
              <AccordionItem value={key}>
                <AccordionHeader>{label}</AccordionHeader>
                <AccordionPanel>
                  <ValueControl
                    value={val}
                    originalValue={childOriginal}
                    highlight={highlight}
                    onChange={(next) => setKey(key, next)}
                    readOnly={readOnly}
                    ariaLabel={label}
                  />
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          );
        }

        return (
          <Field key={key} label={label} className={styles.fieldRow}>
            <ValueControl
              value={val}
              originalValue={childOriginal}
              highlight={highlight}
              onChange={(next) => setKey(key, next)}
              readOnly={readOnly}
              ariaLabel={label}
            />
          </Field>
        );
      })}
    </div>
  );
}

// ── Array of objects → editable table ──────────────────────────────────────────

function ObjectArrayTable({
  rows,
  onChange,
  readOnly,
  originalRows,
  highlight,
}: {
  rows: Array<Record<string, unknown>>;
  onChange: (next: Array<Record<string, unknown>>) => void;
  readOnly?: boolean;
  originalRows?: Array<Record<string, unknown>>;
  highlight?: boolean;
}) {
  const styles = useStyles();
  const columns = columnsFromRows(rows);

  function setCell(rowIndex: number, key: string, next: Json) {
    const updated = rows.map((row, i) => (i === rowIndex ? { ...row, [key]: next } : row));
    onChange(updated);
  }

  function removeRow(rowIndex: number) {
    onChange(rows.filter((_, i) => i !== rowIndex));
  }

  function addRow() {
    onChange([...rows, blankRowFromRows(rows)]);
  }

  return (
    <div>
      <div className={styles.tableWrap}>
        <Table size="small" aria-label="Items">
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHeaderCell key={col}>{prettifyKey(col)}</TableHeaderCell>
              ))}
              {!readOnly ? <TableHeaderCell className={styles.rowActions} /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => (
                  <TableCell key={col}>
                    <ValueControl
                      value={row[col]}
                      originalValue={originalRows?.[rowIndex]?.[col]}
                      highlight={highlight}
                      onChange={(next) => setCell(rowIndex, col, next)}
                      readOnly={readOnly}
                      ariaLabel={`${prettifyKey(col)} row ${rowIndex + 1}`}
                    />
                  </TableCell>
                ))}
                {!readOnly ? (
                  <TableCell className={styles.rowActions}>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Delete16Regular />}
                      aria-label={`Remove row ${rowIndex + 1}`}
                      onClick={() => removeRow(rowIndex)}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!readOnly ? (
        <div className={styles.toolbar}>
          <Button size="small" icon={<Add16Regular />} onClick={addRow}>
            Add row
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ── Array of primitives → list editor ──────────────────────────────────────────

function PrimitiveArrayEditor({
  items,
  onChange,
  readOnly,
  originalItems,
  highlight,
}: {
  items: Json[];
  onChange: (next: Json[]) => void;
  readOnly?: boolean;
  originalItems?: Json[];
  highlight?: boolean;
}) {
  const styles = useStyles();

  function setItem(index: number, next: Json) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, '']);
  }

  return (
    <div className={styles.root}>
      {items.length === 0 ? <Text className={styles.empty}>No items.</Text> : null}
      {items.map((item, index) => (
        <div key={index} className={styles.arrayItem}>
          <div className={styles.arrayItemControl}>
            <ValueControl
              value={item}
              originalValue={originalItems?.[index]}
              highlight={highlight}
              onChange={(next) => setItem(index, next)}
              readOnly={readOnly}
              ariaLabel={`Item ${index + 1}`}
            />
          </div>
          {!readOnly ? (
            <Button
              appearance="subtle"
              size="small"
              icon={<Delete16Regular />}
              aria-label={`Remove item ${index + 1}`}
              onClick={() => removeItem(index)}
            />
          ) : null}
        </div>
      ))}
      {!readOnly ? (
        <div className={styles.toolbar}>
          <Button size="small" icon={<Add16Regular />} onClick={addItem}>
            Add item
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ── Public component ────────────────────────────────────────────────────────────

export interface DynamicFieldEditorProps {
  value: ExtractedData;
  /** Omit (or pass readOnly) to render in read-only mode. */
  onChange?: (next: ExtractedData) => void;
  readOnly?: boolean;
  /** The agent's original data. When provided (and editable), changed fields highlight green. */
  original?: ExtractedData;
}

export function DynamicFieldEditor({ value, onChange, readOnly, original }: DynamicFieldEditorProps) {
  const effectiveReadOnly = readOnly || !onChange;
  return (
    <ObjectFields
      value={value ?? {}}
      original={original}
      highlight={!effectiveReadOnly && original !== undefined}
      onChange={(next) => onChange?.(next)}
      readOnly={effectiveReadOnly}
    />
  );
}
