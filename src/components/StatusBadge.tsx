// Status chips for Processing Status and Review Status, using the centralized
// label/color maps so colors stay consistent across screens.

import { Badge } from '@fluentui/react-components';
import { ProcessingStatus, ReviewStatus, SkillUpdateStatus } from '@/types/domain-models';
import {
  processingStatusColors,
  processingStatusLabels,
  reviewStatusColors,
  reviewStatusLabels,
  skillUpdateStatusColors,
  skillUpdateStatusLabels,
} from '@/constants/status';

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
