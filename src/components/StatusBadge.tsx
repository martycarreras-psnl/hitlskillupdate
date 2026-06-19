// Status chips for Processing Status and Review Status, using the centralized
// label/color maps so colors stay consistent across screens.

import { Badge } from '@fluentui/react-components';
import { Flag16Regular, ErrorCircle16Regular } from '@fluentui/react-icons';
import { ProcessingStatus, ReviewStatus, SkillUpdateStatus } from '@/types/domain-models';
import {
  processingStatusColors,
  processingStatusLabels,
  reviewStatusColors,
  reviewStatusLabels,
  skillUpdateStatusColors,
  skillUpdateStatusLabels,
} from '@/constants/status';
import { reviewReasonLabels, type ReviewReason } from '@/utils/reviewQueue';

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  return (
    <Badge appearance="filled" color={processingStatusColors[status]}>
      {processingStatusLabels[status]}
    </Badge>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge appearance="outline" color={reviewStatusColors[status]}>
      {reviewStatusLabels[status]}
    </Badge>
  );
}

export function SkillUpdateStatusBadge({ status }: { status: SkillUpdateStatus }) {
  return (
    <Badge appearance="filled" color={skillUpdateStatusColors[status]}>
      {skillUpdateStatusLabels[status]}
    </Badge>
  );
}

/** Distinguishes WHY a document is in the review queue: random sample vs. failed processing. */
export function ReviewReasonBadge({ reason }: { reason: ReviewReason }) {
  return reason === 'failed' ? (
    <Badge appearance="filled" color="danger" icon={<ErrorCircle16Regular />}>
      {reviewReasonLabels.failed}
    </Badge>
  ) : (
    <Badge appearance="filled" color="brand" icon={<Flag16Regular />}>
      {reviewReasonLabels.sampled}
    </Badge>
  );
}
