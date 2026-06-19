// Pure, unit-testable random-draw logic for the human-in-the-loop review decision.
// Kept free of React and the data layer so it can be tested in isolation. (ADR 0002.)

import type { ReviewSettings } from '@/types/domain-models';
import { ProcessingStatus, ReviewStatus } from '@/types/domain-models';

/**
 * Draw an inclusive integer in [min, max] using the supplied RNG (defaults to
 * Math.random — statistical sampling, not security-sensitive). The bounds are
 * normalized so an inverted range still yields a valid value.
 */
export function drawInteger(min: number, max: number, rng: () => number = Math.random): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

export interface ReviewDrawResult {
  randomDrawValue: number;
  flaggedForReview: boolean;
  reviewStatus: ReviewStatus;
  processingStatus: ProcessingStatus;
}

/**
 * Run the review draw for a new Document against the current Review Settings.
 * Always sets Processing Status = Queued. If the drawn value equals the Trigger
 * Value, the Document is flagged and enters the review loop (Pending Review);
 * otherwise review is Not Required.
 */
export function computeReviewDraw(
  settings: Pick<ReviewSettings, 'rangeMin' | 'rangeMax' | 'triggerValue'>,
  rng: () => number = Math.random,
): ReviewDrawResult {
  const randomDrawValue = drawInteger(settings.rangeMin, settings.rangeMax, rng);
  const flaggedForReview = randomDrawValue === settings.triggerValue;
  return {
    randomDrawValue,
    flaggedForReview,
    reviewStatus: flaggedForReview ? ReviewStatus.PendingReview : ReviewStatus.NotRequired,
    processingStatus: ProcessingStatus.Queued,
  };
}

export interface ReviewSettingsValidation {
  valid: boolean;
  errors: string[];
}

/** Validate that Range Min ≤ Trigger Value ≤ Range Max and all values are ≥ 1. */
export function validateReviewSettings(
  settings: Pick<ReviewSettings, 'rangeMin' | 'rangeMax' | 'triggerValue'>,
): ReviewSettingsValidation {
  const errors: string[] = [];
  const { rangeMin, rangeMax, triggerValue } = settings;

  for (const [label, val] of [
    ['Range Min', rangeMin],
    ['Range Max', rangeMax],
    ['Trigger Value', triggerValue],
  ] as const) {
    if (!Number.isInteger(val)) errors.push(`${label} must be a whole number.`);
    else if (val < 1) errors.push(`${label} must be at least 1.`);
  }

  if (Number.isInteger(rangeMin) && Number.isInteger(rangeMax) && rangeMin > rangeMax) {
    errors.push('Range Min must be less than or equal to Range Max.');
  }
  if (
    Number.isInteger(triggerValue) &&
    Number.isInteger(rangeMin) &&
    Number.isInteger(rangeMax) &&
    (triggerValue < rangeMin || triggerValue > rangeMax)
  ) {
    errors.push('Trigger Value must fall within the range [Range Min, Range Max].');
  }

  return { valid: errors.length === 0, errors };
}
