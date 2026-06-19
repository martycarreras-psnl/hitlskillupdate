// Pure, unit-testable logic for what belongs in the human review queue and why.
// Two distinct reasons put a Document in front of a reviewer:
//   • 'sampled' — the random draw matched the Trigger Value (flagged) AND the agent
//     has finished, so there is extracted data to verify/correct.
//   • 'failed'  — the agent could not process the document; a human must re-queue it
//     or raise a skill-update request. There is no extracted data to edit.
// Keeping this here (not inline in pages) means every screen agrees on the rules.

import { ProcessingStatus, ReviewStatus, type DocumentRecord } from '@/types/domain-models';

export type ReviewReason = 'sampled' | 'failed';

export const reviewReasonLabels: Record<ReviewReason, string> = {
  sampled: 'Random sample',
  failed: 'Processing failed',
};

/**
 * Why this Document is in the actionable review queue, or null if it is not.
 * 'failed' takes precedence over 'sampled' — a failed extraction has no data to
 * review regardless of whether it was also randomly flagged.
 */
export function reviewReason(doc: DocumentRecord): ReviewReason | null {
  const handled =
    doc.reviewStatus === ReviewStatus.Approved || doc.reviewStatus === ReviewStatus.Rejected;

  if (doc.processingStatus === ProcessingStatus.Failed && !handled) {
    return 'failed';
  }
  if (
    doc.flaggedForReview &&
    doc.processingStatus === ProcessingStatus.Processed &&
    (doc.reviewStatus === ReviewStatus.PendingReview ||
      doc.reviewStatus === ReviewStatus.InReview)
  ) {
    return 'sampled';
  }
  return null;
}

/** True when the Document should appear in the actionable review queue. */
export function isActionableReview(doc: DocumentRecord): boolean {
  return reviewReason(doc) !== null;
}

/**
 * A flagged Document that the agent hasn't finished yet (and hasn't failed). It will
 * become actionable once processing completes — shown as "waiting", not actionable.
 */
export function isAwaitingProcessing(doc: DocumentRecord): boolean {
  return (
    doc.flaggedForReview &&
    doc.processingStatus !== ProcessingStatus.Processed &&
    doc.processingStatus !== ProcessingStatus.Failed &&
    (doc.reviewStatus === ReviewStatus.PendingReview ||
      doc.reviewStatus === ReviewStatus.NotRequired)
  );
}

/**
 * True when a reviewer can manually push this Document into the actionable review queue.
 * Only processed documents have extracted data to verify/correct, so the manual override
 * is offered on any processed Document that is not already actionable — whether it was
 * never sampled (NotRequired) or was already handled (Approved/Rejected) and needs another
 * look. Documents still processing, failed, or already awaiting review are excluded.
 */
export function canSendToReview(doc: DocumentRecord): boolean {
  return doc.processingStatus === ProcessingStatus.Processed && !isActionableReview(doc);
}
