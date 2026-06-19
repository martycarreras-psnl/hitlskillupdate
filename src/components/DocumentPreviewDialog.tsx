// A read-only Document preview shown in a modal dialog. Used where a user wants to
// glance at a document (source file + extracted data) without leaving the current
// screen — e.g. from the Skill Updates table. Composes the same SourceFileViewer and
// Dynamic Field Editor (read-only) as the detail page.

import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Link,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Open16Regular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useDocument } from '@/hooks/useDocuments';
import { ProcessingStatus } from '@/types/domain-models';
import { SourceFileViewer } from '@/components/SourceFileViewer';
import { DynamicFieldEditor } from '@/components/DynamicFieldEditor';
import { ProcessingStatusBadge, ReviewStatusBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  surface: { maxWidth: '920px', width: '90vw' },
  badges: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center', flexWrap: 'wrap', marginBottom: tokens.spacingVerticalM },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 1fr) minmax(260px, 1.2fr)',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, minWidth: 0 },
  sectionTitle: { fontWeight: tokens.fontWeightSemibold },
});

export interface DocumentPreviewDialogProps {
  documentId: string | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentPreviewDialog({ documentId, open, onClose }: DocumentPreviewDialogProps) {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useDocument(open && documentId ? documentId : undefined);

  const isProcessed = doc?.processingStatus === ProcessingStatus.Processed;
  const isFailed = doc?.processingStatus === ProcessingStatus.Failed;

  return (
    <Dialog open={open} onOpenChange={(_e, data) => (!data.open ? onClose() : undefined)}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>{doc?.documentName ?? 'Document'}</DialogTitle>
          <DialogContent>
            {isLoading || !documentId ? (
              <LoadingState />
            ) : !doc ? (
              <EmptyState icon="❓" title="Document not found" />
            ) : (
              <>
                <div className={styles.badges}>
                  <ProcessingStatusBadge status={doc.processingStatus} />
                  <ReviewStatusBadge status={doc.reviewStatus} />
                  {doc.documentTypeName ? (
                    <Badge appearance="tint" color="informative">
                      {doc.documentTypeName}
                    </Badge>
                  ) : null}
                </div>

                <div className={styles.grid}>
                  <SourceFileViewer documentId={doc.id} />

                  <div className={styles.panel}>
                    <Text className={styles.sectionTitle}>Extracted Data</Text>
                    <Divider />
                    {isProcessed && doc.extractedData ? (
                      <DynamicFieldEditor value={doc.extractedData} readOnly />
                    ) : isFailed ? (
                      <Text>No data — extraction failed.</Text>
                    ) : (
                      <Text>No extracted data yet.</Text>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
          <DialogActions>
            {doc ? (
              <Link
                onClick={() => {
                  onClose();
                  navigate(`/documents/${doc.id}`);
                }}
              >
                <Open16Regular /> Open full document
              </Link>
            ) : null}
            <Button appearance="primary" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
