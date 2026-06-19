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
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
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
  Tooltip,
  makeStyles,
  tokens,
  useId,
  useToastController,
} from '@fluentui/react-components';
import { ArrowUpload24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useDocuments, useCreateDocument, useDeleteDocument } from '@/hooks/useDocuments';
import { ProcessingStatus } from '@/types/domain-models';
import type { DocumentRecord } from '@/types/domain-models';
import {
  ALL_PROCESSING_STATUSES,
  isAdmin,
  processingStatusLabels,
} from '@/constants/status';
import { useRole } from '@/hooks/useRole';
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
  docNumber: { fontFamily: tokens.fontFamilyMonospace, whiteSpace: 'nowrap' },
  clickableRow: { cursor: 'pointer' },
  badges: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
});

export function DocumentsPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const { role } = useRole();
  const admin = isAdmin(role);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toasterId = useId('documents-toaster');
  const { dispatchToast } = useToastController(toasterId);

  const [statusFilter, setStatusFilter] = useState<'all' | ProcessingStatus>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);

  const filtered = useMemo(() => {
    return (documents ?? []).filter((doc) => {
      if (statusFilter !== 'all' && doc.processingStatus !== statusFilter) return false;
      if (flaggedOnly && !doc.flaggedForReview) return false;
      const q = search.trim().toLowerCase();
      if (
        q &&
        !doc.documentName.toLowerCase().includes(q) &&
        !(doc.documentNumber ?? '').toLowerCase().includes(q)
      ) {
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
      file,
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const name = pendingDelete.documentName;
    await deleteDocument.mutateAsync(pendingDelete.id);
    setPendingDelete(null);
    dispatchToast(
      <Toast>
        <ToastTitle>Deleted “{name}”</ToastTitle>
      </Toast>,
      { intent: 'success' },
    );
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
          placeholder="Search by name or document #…"
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
                <TableHeaderCell>Document #</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Processing</TableHeaderCell>
                <TableHeaderCell>Review</TableHeaderCell>
                <TableHeaderCell>Drawn</TableHeaderCell>
                {admin ? <TableHeaderCell>Actions</TableHeaderCell> : null}
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
                    <span className={styles.docNumber}>{doc.documentNumber ?? '—'}</span>
                  </TableCell>
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
                  {admin ? (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip content="Delete document" relationship="label">
                        <Button
                          appearance="subtle"
                          icon={<Delete24Regular />}
                          aria-label={`Delete ${doc.documentName}`}
                          onClick={() => setPendingDelete(doc)}
                        />
                      </Tooltip>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(_e, data) => (!data.open ? setPendingDelete(null) : undefined)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogContent>
              This permanently removes “{pendingDelete?.documentName}” and its stored file.
              This action cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" disabled={deleteDocument.isPending}>
                  Cancel
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                icon={deleteDocument.isPending ? <Spinner size="tiny" /> : <Delete24Regular />}
                disabled={deleteDocument.isPending}
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
