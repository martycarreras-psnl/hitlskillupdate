// Documents — filterable list of all documents plus upload. Files can be added via the
// Upload button OR by dragging and dropping one or more files onto the screen; each file
// creates its own Document. Every upload runs the random review draw (via
// useCreateDocument), defaults the name to the file name, and sets Processing Status =
// Queued for the external flow.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  Text,
  Title2,
  Toast,
  ToastTitle,
  ToastBody,
  Toaster,
  Tooltip,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  useId,
  useToastController,
} from '@fluentui/react-components';
import {
  ArrowUpload24Regular,
  Delete24Regular,
  ClipboardTaskListLtr24Regular,
} from '@fluentui/react-icons';
import { useDocuments, useCreateDocument, useDeleteDocument, useUpdateDocument, queryKeys } from '@/hooks/useDocuments';
import { ProcessingStatus, ReviewStatus } from '@/types/domain-models';
import type { DocumentRecord } from '@/types/domain-models';
import {
  ALL_PROCESSING_STATUSES,
  canReview,
  isAdmin,
  processingStatusLabels,
} from '@/constants/status';
import { partitionUploadableFiles } from '@/utils/fileUpload';
import { canSendToReview } from '@/utils/reviewQueue';
import { useRole } from '@/hooks/useRole';
import { ProcessingStatusBadge, ReviewStatusBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, position: 'relative' },
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

  // Drop zone
  dropZone: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.border('2px', 'dashed', tokens.colorNeutralStroke2),
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '0.15s',
  },
  dropZoneActive: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  // Full-screen overlay shown while dragging files over the page.
  dragOverlay: {
    position: 'fixed',
    inset: '0',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    pointerEvents: 'none',
    backgroundColor: 'rgba(15, 31, 61, 0.55)',
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
  },
});

export function DocumentsPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const updateDocument = useUpdateDocument();
  const queryClient = useQueryClient();
  const { role } = useRole();
  const admin = isAdmin(role);
  const reviewer = canReview(role);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toasterId = useId('documents-toaster');
  const { dispatchToast } = useToastController(toasterId);

  const [statusFilter, setStatusFilter] = useState<'all' | ProcessingStatus>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Batch upload progress; null when no upload is in flight.
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const dragDepth = useRef(0);

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

  // Shared upload routine for both the file picker and drag-and-drop. Each accepted file
  // creates its own Document (sequentially, so progress is visible and the mock store
  // stays consistent). Single uploads navigate to the new record; batches stay on the list.
  const uploadFiles = useCallback(
    async (fileList: File[]) => {
      const { accepted, rejected } = partitionUploadableFiles(fileList);

      if (accepted.length === 0) {
        dispatchToast(
          <Toast>
            <ToastTitle>No supported files</ToastTitle>
            <ToastBody>Only PDFs and images can be uploaded.</ToastBody>
          </Toast>,
          { intent: 'error' },
        );
        return;
      }

      setBatch({ done: 0, total: accepted.length });
      const created: DocumentRecord[] = [];
      try {
        for (const file of accepted) {
          const doc = await createDocument.mutateAsync({ file });
          created.push(doc);
          setBatch((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
        }
      } finally {
        setBatch(null);
      }

      // Settle the list once after the whole batch so all new rows appear together
      // (avoids a per-create refetch race that can lag the last row by one fetch).
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents });

      const flaggedCount = created.filter((d) => d.flaggedForReview).length;

      if (created.length === 1 && rejected.length === 0) {
        const only = created[0];
        dispatchToast(
          <Toast>
            <ToastTitle>Document uploaded</ToastTitle>
            <ToastBody>
              Drew {only.randomDrawValue}.{' '}
              {only.flaggedForReview
                ? 'Matched the Trigger Value — flagged for review.'
                : 'Not flagged. Queued for processing.'}
            </ToastBody>
          </Toast>,
          { intent: only.flaggedForReview ? 'warning' : 'success' },
        );
        navigate(`/documents/${only.id}`);
        return;
      }

      dispatchToast(
        <Toast>
          <ToastTitle>
            {created.length} document{created.length === 1 ? '' : 's'} uploaded
          </ToastTitle>
          <ToastBody>
            {flaggedCount > 0 ? `${flaggedCount} flagged for review. ` : 'None flagged. '}
            Queued for processing.
            {rejected.length > 0
              ? ` Skipped ${rejected.length} unsupported file${rejected.length === 1 ? '' : 's'}.`
              : ''}
          </ToastBody>
        </Toast>,
        { intent: flaggedCount > 0 ? 'warning' : 'success' },
      );
    },
    [createDocument, dispatchToast, navigate, queryClient],
  );

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-selecting the same file(s)
    if (files.length > 0) await uploadFiles(files);
  }

  function onDragEnter(event: React.DragEvent) {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function onDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  async function onDrop(event: React.DragEvent) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) await uploadFiles(files);
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

  // Manually push a processed Document into the actionable review queue so a reviewer can
  // correct mistakes, even if the random draw never flagged it. Flags it and sets review
  // status to Pending Review (which makes reviewQueue.reviewReason() return 'sampled').
  async function sendToReview(doc: DocumentRecord) {
    await updateDocument.mutateAsync({
      id: doc.id,
      changes: { flaggedForReview: true, reviewStatus: ReviewStatus.PendingReview },
    });
    dispatchToast(
      <Toast>
        <ToastTitle>Sent to review</ToastTitle>
        <ToastBody>“{doc.documentName}” is now in the review queue.</ToastBody>
      </Toast>,
      { intent: 'success' },
    );
  }

  return (
    <div
      className={styles.root}
      onDragEnter={onDragEnter}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Toaster toasterId={toasterId} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        multiple
        hidden
        onChange={onFileSelected}
        aria-label="Upload document files"
      />

      <div className={styles.header}>
        <Title2>Documents</Title2>
        <Button
          appearance="primary"
          icon={batch ? <Spinner size="tiny" /> : <ArrowUpload24Regular />}
          disabled={batch !== null}
          onClick={onPickFile}
        >
          {batch ? `Uploading ${batch.done}/${batch.total}…` : 'Upload documents'}
        </Button>
      </div>

      <div
        className={mergeClasses(styles.dropZone, isDragging && styles.dropZoneActive)}
        role="button"
        tabIndex={0}
        onClick={onPickFile}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onPickFile();
        }}
      >
        <ArrowUpload24Regular />
        <Text>
          {batch
            ? `Uploading ${batch.done} of ${batch.total}…`
            : 'Drag & drop files here, or click to browse — each file becomes its own document'}
        </Text>
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
                {reviewer ? <TableHeaderCell>Actions</TableHeaderCell> : null}
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
                  {reviewer ? (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className={styles.badges}>
                        {canSendToReview(doc) ? (
                          <Tooltip content="Send to review queue" relationship="label">
                            <Button
                              appearance="subtle"
                              icon={<ClipboardTaskListLtr24Regular />}
                              aria-label={`Send ${doc.documentName} to review`}
                              disabled={updateDocument.isPending}
                              onClick={() => sendToReview(doc)}
                            />
                          </Tooltip>
                        ) : null}
                        {admin ? (
                          <Tooltip content="Delete document" relationship="label">
                            <Button
                              appearance="subtle"
                              icon={<Delete24Regular />}
                              aria-label={`Delete ${doc.documentName}`}
                              onClick={() => setPendingDelete(doc)}
                            />
                          </Tooltip>
                        ) : null}
                      </div>
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

      {isDragging ? (
        <div className={styles.dragOverlay} aria-hidden>
          <ArrowUpload24Regular />
          <span>Drop files to upload — one document per file</span>
        </div>
      ) : null}
    </div>
  );
}
