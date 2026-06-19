// Review Workspace — the editable side of the review loop. Opening a Pending Review
// document moves it to In Review. The reviewer corrects the Extracted Data through the
// Dynamic Field Editor (never raw JSON) and approves or rejects (reject requires a
// comment). Approve/Reject set Review Status and Reviewed On.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Divider,
  MessageBar,
  MessageBarBody,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
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
import { SourceFileViewer } from '@/components/SourceFileViewer';
import { DynamicFieldEditor } from '@/components/DynamicFieldEditor';
import { RejectDialog } from '@/components/RejectDialog';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.3fr)',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL },
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

  // Seed the editable draft from the document once it loads.
  useEffect(() => {
    if (doc && draft === null) {
      setDraft(doc.extractedData ?? {});
    }
  }, [doc, draft]);

  // Move Pending Review → In Review the first time the workspace opens.
  useEffect(() => {
    if (doc && !openedRef.current && doc.reviewStatus === ReviewStatus.PendingReview) {
      openedRef.current = true;
      updateDocument.mutate({ id: doc.id, changes: { reviewStatus: ReviewStatus.InReview } });
    }
  }, [doc, updateDocument]);

  if (isLoading) return <LoadingState />;
  if (!doc) return <EmptyState icon="❓" title="Document not found" />;

  const reviewable =
    doc.flaggedForReview && doc.processingStatus === ProcessingStatus.Processed;

  if (!reviewable) {
    return (
      <div className={styles.root}>
        <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={() => navigate('/review')}>
          Back to queue
        </Button>
        <EmptyState
          icon="⏳"
          title="Not ready for review"
          description="This document must be flagged and processed before it can be reviewed."
        />
      </div>
    );
  }

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

  async function confirmReject(suggestedFix: string) {
    if (!doc) return;
    // Save the corrected data + record the rejection on the document, and raise a
    // Skill Update Request carrying the suggested fix for the agent skill. (ADR 0005.)
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
      <Title2>Reviewing: {doc.documentName}</Title2>

      <div className={styles.grid}>
        <SourceFileViewer documentId={doc.id} />

        <Card className={styles.panel}>
          <Title3>Correct the extracted data</Title3>
          {draft ? (
            <DynamicFieldEditor value={draft} onChange={setDraft} />
          ) : (
            <LoadingState />
          )}

          <Divider />

          {updateDocument.isError || createSkillUpdateRequest.isError ? (
            <MessageBar intent="error">
              <MessageBarBody>Could not save the review. Please try again.</MessageBarBody>
            </MessageBar>
          ) : null}

          <div className={styles.actions}>
            <Button
              appearance="primary"
              icon={<CheckmarkCircle24Regular />}
              disabled={submitting}
              onClick={approve}
            >
              Approve
            </Button>
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
