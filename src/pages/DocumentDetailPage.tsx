// Document Detail — source file + status + metadata + a read-only Dynamic Field Editor.
// Read-only here by design; editing happens in the Review Workspace. Flagged-but-not-yet-
// processed documents show a "waiting for processing" state (they are not yet reviewable).

import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowLeft24Regular, ArrowClockwise24Regular } from '@fluentui/react-icons';
import { useDocument, useUpdateDocument } from '@/hooks/useDocuments';
import { ProcessingStatus, ReviewStatus } from '@/types/domain-models';
import { canReview } from '@/constants/status';
import { useRole } from '@/hooks/useRole';
import { ProcessingStatusBadge, ReviewStatusBadge } from '@/components/StatusBadge';
import { SourceFileViewer } from '@/components/SourceFileViewer';
import { DynamicFieldEditor } from '@/components/DynamicFieldEditor';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  badges: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center', flexWrap: 'wrap' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.3fr)',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL },
  meta: { display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: tokens.spacingHorizontalL, rowGap: tokens.spacingVerticalS },
  metaLabel: { color: tokens.colorNeutralForeground3 },
});

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function DocumentDetailPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading } = useDocument(id);
  const updateDocument = useUpdateDocument();
  const { role } = useRole();

  if (isLoading) return <LoadingState />;
  if (!doc) return <EmptyState icon="❓" title="Document not found" />;

  const isProcessed = doc.processingStatus === ProcessingStatus.Processed;
  const isFailed = doc.processingStatus === ProcessingStatus.Failed;
  const canBeReviewed =
    doc.flaggedForReview && isProcessed && doc.reviewStatus === ReviewStatus.PendingReview;

  async function requeue() {
    if (!doc) return;
    await updateDocument.mutateAsync({
      id: doc.id,
      changes: { processingStatus: ProcessingStatus.Queued, processingError: undefined },
    });
  }

  return (
    <div className={styles.root}>
      <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={() => navigate('/documents')}>
        Back to documents
      </Button>

      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <Title2>{doc.documentName}</Title2>
          <div className={styles.badges}>
            <ProcessingStatusBadge status={doc.processingStatus} />
            <ReviewStatusBadge status={doc.reviewStatus} />
            {doc.flaggedForReview ? (
              <Badge color="warning" appearance="tint">
                Flagged · drew {doc.randomDrawValue}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className={styles.badges}>
          {isFailed ? (
            <Button
              icon={<ArrowClockwise24Regular />}
              onClick={requeue}
              disabled={updateDocument.isPending}
            >
              Re-queue
            </Button>
          ) : null}
          {canBeReviewed && canReview(role) ? (
            <Button appearance="primary" onClick={() => navigate(`/review/${doc.id}`)}>
              Open in review
            </Button>
          ) : null}
        </div>
      </div>

      {isFailed && doc.processingError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Processing failed</MessageBarTitle>
            {doc.processingError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={styles.grid}>
        <SourceFileViewer documentId={doc.id} />

        <Card className={styles.panel}>
          <Title3>Details</Title3>
          <div className={styles.meta}>
            <Text className={styles.metaLabel}>Document Type</Text>
            <Text>{doc.documentTypeName ?? 'Unclassified (set by the Agent)'}</Text>
            <Text className={styles.metaLabel}>Random Draw Value</Text>
            <Text>{doc.randomDrawValue ?? '—'}</Text>
            <Text className={styles.metaLabel}>Processed On</Text>
            <Text>{formatDate(doc.processedOn)}</Text>
            <Text className={styles.metaLabel}>Reviewed On</Text>
            <Text>{formatDate(doc.reviewedOn)}</Text>
            {doc.reviewComment ? (
              <>
                <Text className={styles.metaLabel}>Review Comment</Text>
                <Text>{doc.reviewComment}</Text>
              </>
            ) : null}
          </div>

          <Divider />

          <Title3>Extracted Data</Title3>
          {isProcessed && doc.extractedData ? (
            <DynamicFieldEditor value={doc.extractedData} readOnly />
          ) : isFailed ? (
            <Text>No data — extraction failed.</Text>
          ) : (
            <MessageBar intent="info">
              <MessageBarBody>
                <MessageBarTitle>Waiting for processing</MessageBarTitle>
                The external flow hasn’t written extracted data yet. It will appear here once the
                Agent finishes.
              </MessageBarBody>
            </MessageBar>
          )}
        </Card>
      </div>
    </div>
  );
}
