// The random review draw, exposed as a hook for the upload flow. Reads the current
// Review Settings from the provider each time (so an Admin change takes effect on the
// next upload) and delegates to the pure computeReviewDraw function. (ADR 0002.)

import { useCallback } from 'react';
import { createAppDataProvider } from '@/services/providerFactory';
import { computeReviewDraw, type ReviewDrawResult } from '@/utils/randomDraw';

const provider = createAppDataProvider();

export function useRandomReviewDraw() {
  return useCallback(async (): Promise<ReviewDrawResult> => {
    const settings = await provider.reviewSettings.get();
    return computeReviewDraw(settings);
  }, []);
}
