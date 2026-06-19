import { describe, it, expect } from 'vitest';
import {
  drawInteger,
  computeReviewDraw,
  validateReviewSettings,
} from './randomDraw';
import { ProcessingStatus, ReviewStatus } from '@/types/domain-models';

describe('drawInteger', () => {
  it('returns the minimum when the RNG yields 0', () => {
    expect(drawInteger(1, 20, () => 0)).toBe(1);
  });

  it('returns the maximum when the RNG yields just under 1', () => {
    expect(drawInteger(1, 20, () => 0.999999)).toBe(20);
  });

  it('is inclusive of both bounds', () => {
    for (let i = 0; i < 1000; i++) {
      const value = drawInteger(3, 9);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });

  it('normalizes an inverted range', () => {
    expect(drawInteger(20, 1, () => 0)).toBe(1);
  });
});

describe('computeReviewDraw', () => {
  const settings = { rangeMin: 1, rangeMax: 20, triggerValue: 7 };

  it('flags the document when the draw equals the Trigger Value', () => {
    // floor(0.3 * 20) + 1 = 7
    const result = computeReviewDraw(settings, () => 0.3);
    expect(result.randomDrawValue).toBe(7);
    expect(result.flaggedForReview).toBe(true);
    expect(result.reviewStatus).toBe(ReviewStatus.PendingReview);
    expect(result.processingStatus).toBe(ProcessingStatus.Queued);
  });

  it('does not flag when the draw differs from the Trigger Value', () => {
    const result = computeReviewDraw(settings, () => 0);
    expect(result.randomDrawValue).toBe(1);
    expect(result.flaggedForReview).toBe(false);
    expect(result.reviewStatus).toBe(ReviewStatus.NotRequired);
    expect(result.processingStatus).toBe(ProcessingStatus.Queued);
  });

  it('always queues the document for the external flow', () => {
    const result = computeReviewDraw(settings, () => 0.5);
    expect(result.processingStatus).toBe(ProcessingStatus.Queued);
  });
});

describe('validateReviewSettings', () => {
  it('accepts a valid configuration', () => {
    expect(validateReviewSettings({ rangeMin: 1, rangeMax: 20, triggerValue: 7 }).valid).toBe(true);
  });

  it('rejects values below 1', () => {
    const result = validateReviewSettings({ rangeMin: 0, rangeMax: 20, triggerValue: 7 });
    expect(result.valid).toBe(false);
  });

  it('rejects Range Min greater than Range Max', () => {
    const result = validateReviewSettings({ rangeMin: 20, rangeMax: 1, triggerValue: 7 });
    expect(result.valid).toBe(false);
  });

  it('rejects a Trigger Value outside the range', () => {
    const result = validateReviewSettings({ rangeMin: 1, rangeMax: 5, triggerValue: 7 });
    expect(result.valid).toBe(false);
  });
});
