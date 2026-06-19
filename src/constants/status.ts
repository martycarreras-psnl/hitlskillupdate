// Display metadata for the option-set statuses and the three app roles.
// Centralized so chips, filters, and dashboards stay consistent.

import type { BadgeProps } from '@fluentui/react-components';
import { ProcessingStatus, ReviewStatus, SkillUpdateStatus } from '@/types/domain-models';

export const processingStatusLabels: Record<ProcessingStatus, string> = {
  [ProcessingStatus.Uploaded]: 'Uploaded',
  [ProcessingStatus.Queued]: 'Queued',
  [ProcessingStatus.Processing]: 'Processing',
  [ProcessingStatus.Processed]: 'Processed',
  [ProcessingStatus.Failed]: 'Failed',
};

export const processingStatusColors: Record<ProcessingStatus, BadgeProps['color']> = {
  [ProcessingStatus.Uploaded]: 'informative',
  [ProcessingStatus.Queued]: 'brand',
  [ProcessingStatus.Processing]: 'warning',
  [ProcessingStatus.Processed]: 'success',
  [ProcessingStatus.Failed]: 'danger',
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  [ReviewStatus.NotRequired]: 'Not Required',
  [ReviewStatus.PendingReview]: 'Pending Review',
  [ReviewStatus.InReview]: 'In Review',
  [ReviewStatus.Approved]: 'Approved',
  [ReviewStatus.Rejected]: 'Rejected',
};

export const reviewStatusColors: Record<ReviewStatus, BadgeProps['color']> = {
  [ReviewStatus.NotRequired]: 'subtle',
  [ReviewStatus.PendingReview]: 'warning',
  [ReviewStatus.InReview]: 'brand',
  [ReviewStatus.Approved]: 'success',
  [ReviewStatus.Rejected]: 'danger',
};

export const ALL_PROCESSING_STATUSES: ProcessingStatus[] = [
  ProcessingStatus.Uploaded,
  ProcessingStatus.Queued,
  ProcessingStatus.Processing,
  ProcessingStatus.Processed,
  ProcessingStatus.Failed,
];

export const skillUpdateStatusLabels: Record<SkillUpdateStatus, string> = {
  [SkillUpdateStatus.New]: 'New',
  [SkillUpdateStatus.InProgress]: 'In Progress',
  [SkillUpdateStatus.Approved]: 'Approved — Implement',
  [SkillUpdateStatus.Completed]: 'Completed',
  [SkillUpdateStatus.Dismissed]: 'Dismissed',
};

export const skillUpdateStatusColors: Record<SkillUpdateStatus, BadgeProps['color']> = {
  [SkillUpdateStatus.New]: 'brand',
  [SkillUpdateStatus.InProgress]: 'warning',
  [SkillUpdateStatus.Approved]: 'important',
  [SkillUpdateStatus.Completed]: 'success',
  [SkillUpdateStatus.Dismissed]: 'subtle',
};

export const ALL_SKILL_UPDATE_STATUSES: SkillUpdateStatus[] = [
  SkillUpdateStatus.New,
  SkillUpdateStatus.InProgress,
  SkillUpdateStatus.Approved,
  SkillUpdateStatus.Completed,
  SkillUpdateStatus.Dismissed,
];

/**
 * App roles. In the prototype the active role is chosen via an in-app switcher so
 * role-gated screens can be demonstrated; in production these map to Dataverse
 * security roles and authorization is delegated entirely to Dataverse (decision #11).
 */
export type AppRole = 'Uploader' | 'Reviewer' | 'Admin';

export const ALL_ROLES: AppRole[] = ['Uploader', 'Reviewer', 'Admin'];

export function canReview(role: AppRole): boolean {
  return role === 'Reviewer' || role === 'Admin';
}

export function isAdmin(role: AppRole): boolean {
  return role === 'Admin';
}
