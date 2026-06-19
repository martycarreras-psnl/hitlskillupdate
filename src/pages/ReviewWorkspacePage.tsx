// Review Workspace — the editable side of the review loop. A document reaches here for
// one of two reasons (see reviewQueue):
//   • 'sampled' — randomly flagged & processed: the reviewer corrects the Extracted Data
//     through the Dynamic Field Editor (changed fields highlight green) and Approves or
//     Rejects (reject raises a Skill Update Request).
//   • 'failed'  — the agent could not process it: there is no data to edit, so the
//     reviewer either Re-queues it or rejects it with a suggested agent-skill fix.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  ArrowLeft24Regular,
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
} from '@fluentui/react-icons';
import {
  useCreateSkillUpdateRequest,
  useDocument,
  useUpdateDocument,
} from '@/hooks/useDocuments';
import { ProcessingStatus, ReviewStatus, type ExtractedData } from '@/types/domain-models';
import { reviewReason } from '@/utils/reviewQueue';
import { SourceFileViewer } from '@/components/SourceFileViewer';
import { DynamicFieldEditor } from '@/components/DynamicFieldEditor';
import { RejectDialog } from '@/components/RejectDialog';
import { ReviewReasonBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  titleRow: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.3fr)',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
});

export function ReviewWorkspacePage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading } = useDocument(id);
  const updateDocument = useUpdateDocument();
  const createSkillUpdateRequest = useCreateSkillUpdateRequest();

  const [draft, setDraft] = useState<ExtractedData | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const openedRef = useRef(false);
  // Snapshot of the agent's original extracted data, captured once, so the editor can
  // highlight which fields the reviewer changed (green) regardless of cache refetches.
  const originalRef = useRef<ExtractedData | null>(null);

  // Seed the editable draft + original snapshot from the document once it loads.
  useEffect(() => {
    if (doc && draft === null) {
      setDraft(doc.extractedData ?? {});
      originalRef.current = doc.extractedData ?? {};
    }
  }, [doc, draft]);

  // Move Pending Review → In Review the first time the workspace opens (sampled path).
  useEffect(() => {
    if (doc && !openedRef.current && doc.reviewStatus === ReviewStatus.PendingReview) {
      openedRef.current = true;
      updateDocument.mutate({ id: doc.id, changes: { reviewStatus: ReviewStatus.InReview } });
    }
  }, [doc, updateDocument]);

  if (isLoading) return <LoadingState />;
  if (!doc) return <EmptyState icon="❓" title="Document not found" />;

  const reason = reviewReason(doc);

  if (!reason) {
    return (
      <div className={styles.root}>
        <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={() => navigate('/review')}>
          Back to queue
        </Button>
        <EmptyState
          icon="⏳"
          title="Not ready for review"
          description="This document is not currently in the review queue."
        />
      </div>
    );
  }

  const isFailed = reason === 'failed';

  async function approve() {
    if (!doc) return;
    setSubmitting(true);
    try {
      await updateDocument.mutateAsync({
        id: doc.id,
        changes: {
          extractedData: draft ?? {},
          reviewStatus: ReviewStatus.Approved,
          reviewedOn: new Date().toISOString(),
        },
      });
      navigate('/review');
    } finally {
      setSubmitting(false);
    }
  }

  async function requeue() {
    if (!doc) return;
    setSubmitting(true);
    try {
      await updateDocument.mutateAsync({
        id: doc.id,
        changes: { processingStatus: ProcessingStatus.Queued, processingError: undefined },
      });
      navigate('/review');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReject(suggestedFix: string) {
    if (!doc) return;
    // Record the rejection on the document and raise a Skill Update Request carrying
    // the suggested fix for the agent skill. (ADR 0005.)
    setSubmitting(true);
    try {
      await updateDocument.mutateAsync({
        id: doc.id,
        changes: {
          extractedData: draft ?? {},
          reviewComment: suggestedFix,
          reviewStatus: ReviewStatus.Rejected,
          reviewedOn: new Date().toISOString(),
        },
      });
      await createSkillUpdateRequest.mutateAsync({
        documentId: doc.id,
        documentName: doc.documentName,
        documentTypeName: doc.documentTypeName,
        suggestedFix,
      });
      setRejectOpen(false);
      navigate('/review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.root}>
      <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={() => navigate('/review')}>
        Back to queue
      </Button>
      <div className={styles.titleRow}>
        <Title2>Reviewing: {doc.documentName}</Title2>
        <ReviewReasonBadge reason={reason} />
      </div>

      <div className={styles.grid}>
        <SourceFileViewer documentId={doc.id} />

        <Card className={styles.panel}>
          {isFailed ? (
            <>
              <Title3>Processing failed</Title3>
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>The agent could not process this document.</MessageBarTitle>
                  {doc.processingError ?? 'No further detail was provided.'}
                </MessageBarBody>
              </MessageBar>
              <span className={styles.hint}>
                There is no extracted data to correct. Re-queue the document to try again, or reject
                it with a suggested fix so the agent skill can be improved.
              </span>
            </>
          ) : (
            <>
              <Title3>Correct the extracted data</Title3>
              <span className={styles.hint}>Changed fields are highlighted in green.</span>
              {draft ? (
                <DynamicFieldEditor
                  value={draft}
                  original={originalRef.current ?? undefined}
                  onChange={setDraft}
                />
              ) : (
                <LoadingState />
              )}
            </>
          )}

          <Divider />

          {updateDocument.isError || createSkillUpdateRequest.isError ? (
            <MessageBar intent="error">
              <MessageBarBody>Could not save the review. Please try again.</MessageBarBody>
            </MessageBar>
          ) : null}

          <div className={styles.actions}>
            {isFailed ? (
              <Button
                appearance="primary"
                icon={<ArrowClockwise24Regular />}
                disabled={submitting}
                onClick={requeue}
              >
                Re-queue
              </Button>
            ) : (
              <Button
                appearance="primary"
                icon={<CheckmarkCircle24Regular />}
                disabled={submitting}
                onClick={approve}
              >
                Approve
              </Button>
            )}
            <Button
              icon={<DismissCircle24Regular />}
              disabled={submitting}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          </div>
        </Card>
      </div>

      <RejectDialog
        open={rejectOpen}
        documentName={doc.documentName}
        submitting={submitting}
        onConfirm={confirmReject}
        onCancel={() => setRejectOpen(false)}
      />
    </div>
  );
}
