// Admin Settings — edit the Review Settings that drive the random draw (validated so
// Range Min ≤ Trigger Value ≤ Range Max, all ≥ 1) and manage the Document Type catalog.
// Admin-only (also route-gated in App). The DataverseFieldLabel metadata pattern is
// applied to the Review Settings inputs in Phase 4, once they bind to real columns.

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Textarea,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Add24Regular, Save24Regular } from '@fluentui/react-icons';
import {
  useCreateDocumentType,
  useDocumentTypes,
  useReviewSettings,
  useUpdateDocumentType,
  useUpdateReviewSettings,
} from '@/hooks/useDocuments';
import { validateReviewSettings } from '@/utils/randomDraw';
import { LoadingState } from '@/components/EmptyState';
import { DataverseFieldLabel, useDataverseFieldRequired } from '@/components/DataverseFieldLabel';

const REVIEW_SETTINGS_TABLE = 'msfthitl_reviewsetting';

function ReviewNumberField({
  field,
  fallback,
  value,
  onChange,
}: {
  field: string;
  fallback: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const required = useDataverseFieldRequired(REVIEW_SETTINGS_TABLE, field, true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, width: '160px' }}>
      <DataverseFieldLabel
        tableLogicalName={REVIEW_SETTINGS_TABLE}
        fieldLogicalName={field}
        fallback={fallback}
        htmlFor={field}
      />
      <Input
        id={field}
        type="number"
        min={1}
        value={value}
        aria-required={required || undefined}
        onChange={(_e, d) => onChange(d.value)}
      />
    </div>
  );
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, maxWidth: '900px' },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  card: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL },
  numberRow: { display: 'flex', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' },
  numberField: { width: '160px' },
  addRow: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'flex-end', flexWrap: 'wrap' },
});

export function AdminSettingsPage() {
  const styles = useStyles();
  const { data: settings, isLoading } = useReviewSettings();
  const updateSettings = useUpdateReviewSettings();
  const { data: documentTypes, isLoading: typesLoading } = useDocumentTypes();
  const createType = useCreateDocumentType();
  const updateType = useUpdateDocumentType();

  const [rangeMin, setRangeMin] = useState('1');
  const [rangeMax, setRangeMax] = useState('20');
  const [triggerValue, setTriggerValue] = useState('7');
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');

  useEffect(() => {
    if (settings) {
      setRangeMin(String(settings.rangeMin));
      setRangeMax(String(settings.rangeMax));
      setTriggerValue(String(settings.triggerValue));
    }
  }, [settings]);

  if (isLoading || !settings) return <LoadingState />;

  async function saveSettings() {
    setSaved(false);
    const parsed = {
      rangeMin: Number(rangeMin),
      rangeMax: Number(rangeMax),
      triggerValue: Number(triggerValue),
    };
    const result = validateReviewSettings(parsed);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    await updateSettings.mutateAsync(parsed);
    setSaved(true);
  }

  async function addType() {
    if (!newTypeName.trim()) return;
    await createType.mutateAsync({
      typeName: newTypeName.trim(),
      description: newTypeDescription.trim() || undefined,
      isActive: true,
    });
    setNewTypeName('');
    setNewTypeDescription('');
  }

  return (
    <div className={styles.root}>
      <Title2>Admin Settings</Title2>

      <div className={styles.section}>
        <Title3>Review Settings</Title3>
        <Card className={styles.card}>
          <div className={styles.numberRow}>
            <ReviewNumberField field="msfthitl_rangemin" fallback="Range Min" value={rangeMin} onChange={setRangeMin} />
            <ReviewNumberField field="msfthitl_rangemax" fallback="Range Max" value={rangeMax} onChange={setRangeMax} />
            <ReviewNumberField field="msfthitl_triggervalue" fallback="Trigger Value" value={triggerValue} onChange={setTriggerValue} />
          </div>

          {errors.length > 0 ? (
            <MessageBar intent="error">
              <MessageBarBody>
                <MessageBarTitle>Invalid settings</MessageBarTitle>
                {errors.join(' ')}
              </MessageBarBody>
            </MessageBar>
          ) : null}

          {saved ? (
            <MessageBar intent="success">
              <MessageBarBody>Review Settings saved. New uploads use these values.</MessageBarBody>
            </MessageBar>
          ) : null}

          <div>
            <Button
              appearance="primary"
              icon={updateSettings.isPending ? <Spinner size="tiny" /> : <Save24Regular />}
              disabled={updateSettings.isPending}
              onClick={saveSettings}
            >
              Save settings
            </Button>
          </div>
        </Card>
      </div>

      <div className={styles.section}>
        <Title3>Document Types</Title3>
        <Card className={styles.card}>
          {typesLoading ? (
            <LoadingState />
          ) : (
            <Table aria-label="Document types">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Type Name</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell>Active</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(documentTypes ?? []).map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.typeName}</TableCell>
                    <TableCell>{type.description ?? '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={type.isActive}
                        aria-label={`${type.typeName} active`}
                        onChange={(_e, d) =>
                          updateType.mutate({ id: type.id, changes: { isActive: Boolean(d.checked) } })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className={styles.addRow}>
            <Field label="New type name" className={styles.numberField}>
              <Input
                value={newTypeName}
                placeholder="e.g. Purchase Order"
                onChange={(_e, d) => setNewTypeName(d.value)}
              />
            </Field>
            <Field label="Description" style={{ flexGrow: 1, minWidth: '220px' }}>
              <Textarea
                value={newTypeDescription}
                onChange={(_e, d) => setNewTypeDescription(d.value)}
              />
            </Field>
            <Button
              icon={<Add24Regular />}
              disabled={!newTypeName.trim() || createType.isPending}
              onClick={addType}
            >
              Add type
            </Button>
          </div>
        </Card>
      </div>

      <Badge appearance="tint" color="informative">
        Authorization &amp; data visibility are delegated to Dataverse security roles (Uploader /
        Reviewer / Admin) — not modeled in app code.
      </Badge>
    </div>
  );
}
