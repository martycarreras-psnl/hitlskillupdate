import { describe, it, expect } from 'vitest';
import {
  reviewReason,
  isActionableReview,
  isAwaitingProcessing,
} from './reviewQueue';
import {
  ProcessingStatus,
  ReviewStatus,
  type DocumentRecord,
} from '@/types/domain-models';

function doc(overrides: Partial<DocumentRecord>): DocumentRecord {
  return {
    id: 'd',
    documentName: 'd.pdf',
    processingStatus: ProcessingStatus.Processed,
    flaggedForReview: false,
    reviewStatus: ReviewStatus.NotRequired,
    ...overrides,
  };
}

describe('reviewReason', () => {
  it('returns "sampled" for a flagged + processed + pending document', () => {
    expect(
      reviewReason(
        doc({
          flaggedForReview: true,
          processingStatus: ProcessingStatus.Processed,
          reviewStatus: ReviewStatus.PendingReview,
        }),
      ),
    ).toBe('sampled');
  });

  it('keeps a sampled document actionable while it is being reviewed (In Review)', () => {
    expect(
      reviewReason(
        doc({
          flaggedForReview: true,
          processingStatus: ProcessingStatus.Processed,
          reviewStatus: ReviewStatus.InReview,
        }),
      ),
    ).toBe('sampled');
  });

  it('returns "failed" for a failed document regardless of the draw', () => {
    expect(reviewReason(doc({ processingStatus: ProcessingStatus.Failed }))).toBe('failed');
    expect(
      reviewReason(
        doc({ processingStatus: ProcessingStatus.Failed, flaggedForReview: true }),
      ),
    ).toBe('failed');
  });

  it('failed takes precedence over sampled', () => {
    // A flagged doc that failed has no data to review -> treated as failed.
    expect(
      reviewReason(
        doc({
          processingStatus: ProcessingStatus.Failed,
          flaggedForReview: true,
          reviewStatus: ReviewStatus.PendingReview,
        }),
      ),
    ).toBe('failed');
  });

  it('drops a failed document out of the queue once it is approved or rejected', () => {
    expect(
      reviewReason(
        doc({ processingStatus: ProcessingStatus.Failed, reviewStatus: ReviewStatus.Rejected }),
      ),
    ).toBeNull();
    expect(
      reviewReason(
        doc({ processingStatus: ProcessingStatus.Failed, reviewStatus: ReviewStatus.Approved }),
      ),
    ).toBeNull();
  });

  it('returns null for a normal processed, non-flagged document', () => {
    expect(reviewReason(doc({ processingStatus: ProcessingStatus.Processed }))).toBeNull();
  });

  it('returns null for a flagged document that has not finished processing', () => {
    expect(
      reviewReason(
        doc({
          flaggedForReview: true,
          processingStatus: ProcessingStatus.Queued,
          reviewStatus: ReviewStatus.PendingReview,
        }),
      ),
    ).toBeNull();
  });
});

describe('isActionableReview', () => {
  it('is true for sampled and failed, false otherwise', () => {
    expect(isActionableReview(doc({ processingStatus: ProcessingStatus.Failed }))).toBe(true);
    expect(
      isActionableReview(
        doc({
          flaggedForReview: true,
          processingStatus: ProcessingStatus.Processed,
          reviewStatus: ReviewStatus.PendingReview,
        }),
      ),
    ).toBe(true);
    expect(isActionableReview(doc({}))).toBe(false);
  });
});

describe('isAwaitingProcessing', () => {
  it('is true for a flagged, not-yet-processed, not-failed document', () => {
    expect(
      isAwaitingProcessing(
        doc({
          flaggedForReview: true,
          processingStatus: ProcessingStatus.Queued,
          reviewStatus: ReviewStatus.PendingReview,
        }),
      ),
    ).toBe(true);
  });

  it('is false once processed and false for failed (failed is actionable, not waiting)', () => {
    expect(
      isAwaitingProcessing(
        doc({ flaggedForReview: true, processingStatus: ProcessingStatus.Processed }),
      ),
    ).toBe(false);
    expect(
      isAwaitingProcessing(
        doc({ flaggedForReview: true, processingStatus: ProcessingStatus.Failed }),
      ),
    ).toBe(false);
  });
});
