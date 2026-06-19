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
});

type Json = unknown;

interface ControlProps {
  value: Json;
  onChange: (next: Json) => void;
  readOnly?: boolean;
  ariaLabel?: string;
}

// ── Single value → control ────────────────────────────────────────────────────

function ValueControl({ value, onChange, readOnly, ariaLabel }: ControlProps) {
  const styles = useStyles();
  const kind = inferFieldKind(value);

  switch (kind) {
    case 'boolean':
      return (
        <Switch
          checked={Boolean(value)}
          disabled={readOnly}
          aria-label={ariaLabel}
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
          onChange={(_e, data) => onChange(data.value)}
        />
      );
    case 'object':
      return (
        <div className={styles.nested}>
          <ObjectFields
            value={(value ?? {}) as ExtractedData}
            onChange={(next) => onChange(next)}
            readOnly={readOnly}
          />
        </div>
      );
    case 'array-of-objects':
      return (
        <ObjectArrayTable
          rows={(value as Array<Record<string, unknown>>) ?? []}
          onChange={(next) => onChange(next)}
          readOnly={readOnly}
        />
      );
    case 'array-of-primitives':
      return (
        <PrimitiveArrayEditor
          items={(value as Json[]) ?? []}
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
}: {
  value: ExtractedData;
  onChange: (next: ExtractedData) => void;
  readOnly?: boolean;
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

        // Nested objects and arrays-of-objects get a collapsible section.
        if (kind === 'object' || kind === 'array-of-objects') {
          return (
            <Accordion key={key} collapsible defaultOpenItems={[key]}>
              <AccordionItem value={key}>
                <AccordionHeader>{label}</AccordionHeader>
                <AccordionPanel>
                  <ValueControl
                    value={val}
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
}: {
  rows: Array<Record<string, unknown>>;
  onChange: (next: Array<Record<string, unknown>>) => void;
  readOnly?: boolean;
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
}: {
  items: Json[];
  onChange: (next: Json[]) => void;
  readOnly?: boolean;
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
}

export function DynamicFieldEditor({ value, onChange, readOnly }: DynamicFieldEditorProps) {
  const effectiveReadOnly = readOnly || !onChange;
  return (
    <ObjectFields
      value={value ?? {}}
      onChange={(next) => onChange?.(next)}
      readOnly={effectiveReadOnly}
    />
  );
}
