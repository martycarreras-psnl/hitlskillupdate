// Documents — filterable list of all documents plus the Upload action. Upload runs the
// random review draw (via useCreateDocument), defaults the name to the file name, and
// sets Processing Status = Queued for the external flow.

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
  Toast,
  ToastTitle,
  ToastBody,
  Toaster,
  makeStyles,
  tokens,
  useId,
  useToastController,
} from '@fluentui/react-components';
import { ArrowUpload24Regular } from '@fluentui/react-icons';
import { useDocuments, useCreateDocument } from '@/hooks/useDocuments';
import { ProcessingStatus } from '@/types/domain-models';
import {
  ALL_PROCESSING_STATUSES,
  processingStatusLabels,
} from '@/constants/status';
import { ProcessingStatusBadge, ReviewStatusBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  nameCell: { display: 'flex', flexDirection: 'column' },
  clickableRow: { cursor: 'pointer' },
  badges: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
});

export function DocumentsPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toasterId = useId('documents-toaster');
  const { dispatchToast } = useToastController(toasterId);

  const [statusFilter, setStatusFilter] = useState<'all' | ProcessingStatus>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return (documents ?? []).filter((doc) => {
      if (statusFilter !== 'all' && doc.processingStatus !== statusFilter) return false;
      if (flaggedOnly && !doc.flaggedForReview) return false;
      if (search.trim() && !doc.documentName.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [documents, statusFilter, flaggedOnly, search]);

  function onPickFile() {
    fileInputRef.current?.click();
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    const created = await createDocument.mutateAsync({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    });

    dispatchToast(
      <Toast>
        <ToastTitle>Document uploaded</ToastTitle>
        <ToastBody>
          Drew {created.randomDrawValue}.{' '}
          {created.flaggedForReview
            ? 'Matched the Trigger Value — flagged for review.'
            : 'Not flagged. Queued for processing.'}
        </ToastBody>
      </Toast>,
      { intent: created.flaggedForReview ? 'warning' : 'success' },
    );

    navigate(`/documents/${created.id}`);
  }

  return (
    <div className={styles.root}>
      <Toaster toasterId={toasterId} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        hidden
        onChange={onFileSelected}
        aria-label="Upload document file"
      />

      <div className={styles.header}>
        <Title2>Documents</Title2>
        <Button
          appearance="primary"
          icon={createDocument.isPending ? <Spinner size="tiny" /> : <ArrowUpload24Regular />}
          disabled={createDocument.isPending}
          onClick={onPickFile}
        >
          Upload document
        </Button>
      </div>

      <div className={styles.filters}>
        <Select
          aria-label="Filter by processing status"
          value={String(statusFilter)}
          onChange={(_e, data) =>
            setStatusFilter(data.value === 'all' ? 'all' : (Number(data.value) as ProcessingStatus))
          }
        >
          <option value="all">All statuses</option>
          {ALL_PROCESSING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {processingStatusLabels[status]}
            </option>
          ))}
        </Select>
        <Checkbox
          label="Flagged only"
          checked={flaggedOnly}
          onChange={(_e, data) => setFlaggedOnly(Boolean(data.checked))}
        />
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(_e, data) => setSearch(data.value)}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No documents match"
            description="Adjust the filters or upload a new document."
          />
        ) : (
          <Table aria-label="Documents">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Processing</TableHeaderCell>
                <TableHeaderCell>Review</TableHeaderCell>
                <TableHeaderCell>Drawn</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => (
                <TableRow
                  key={doc.id}
                  className={styles.clickableRow}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <TableCell>
                    <div className={styles.nameCell}>
                      <span>{doc.documentName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{doc.documentTypeName ?? '—'}</TableCell>
                  <TableCell>
                    <ProcessingStatusBadge status={doc.processingStatus} />
                  </TableCell>
                  <TableCell>
                    <div className={styles.badges}>
                      {doc.flaggedForReview ? (
                        <Badge color="warning" appearance="tint">
                          Flagged
                        </Badge>
                      ) : null}
                      <ReviewStatusBadge status={doc.reviewStatus} />
                    </div>
                  </TableCell>
                  <TableCell>{doc.randomDrawValue ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
