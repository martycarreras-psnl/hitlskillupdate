// Dashboard — counts by Processing Status, the review backlog, and recent uploads.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Card,
  Text,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useDocuments } from '@/hooks/useDocuments';
import { ProcessingStatus, ReviewStatus } from '@/types/domain-models';
import {
  ALL_PROCESSING_STATUSES,
  processingStatusColors,
  processingStatusLabels,
} from '@/constants/status';
import { ProcessingStatusBadge, ReviewStatusBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalL,
  },
  statValue: { fontSize: '32px', fontWeight: tokens.fontWeightBold, lineHeight: '1' },
  backlog: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
  },
  backlogValue: { fontSize: '40px', fontWeight: tokens.fontWeightBold, color: tokens.colorPaletteRedForeground1 },
  recent: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  rowLeft: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS, minWidth: 0 },
  rowBadges: { display: 'flex', gap: tokens.spacingHorizontalXS, flexShrink: 0 },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
});

export function DashboardPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();

  const stats = useMemo(() => {
    const counts = new Map<ProcessingStatus, number>();
    for (const status of ALL_PROCESSING_STATUSES) counts.set(status, 0);
    let backlog = 0;
    for (const doc of documents ?? []) {
      counts.set(doc.processingStatus, (counts.get(doc.processingStatus) ?? 0) + 1);
      if (
        doc.flaggedForReview &&
        doc.processingStatus === ProcessingStatus.Processed &&
        doc.reviewStatus === ReviewStatus.PendingReview
      ) {
        backlog += 1;
      }
    }
    return { counts, backlog };
  }, [documents]);

  const recent = useMemo(() => (documents ?? []).slice(0, 5), [documents]);

  if (isLoading) return <LoadingState />;

  return (
    <div className={styles.root}>
      <Title2>Dashboard</Title2>

      <div className={styles.cards}>
        {ALL_PROCESSING_STATUSES.map((status) => (
          <Card key={status} className={styles.statCard}>
            <Badge appearance="filled" color={processingStatusColors[status]}>
              {processingStatusLabels[status]}
            </Badge>
            <span className={styles.statValue}>{stats.counts.get(status) ?? 0}</span>
          </Card>
        ))}
      </div>

      <div className={styles.section}>
        <Title3>Review backlog</Title3>
        <Card
          className={styles.backlog}
          onClick={() => navigate('/review')}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles.backlogValue}>{stats.backlog}</span>
          <Text>
            document{stats.backlog === 1 ? '' : 's'} flagged, processed, and waiting for review.
          </Text>
        </Card>
      </div>

      <div className={styles.section}>
        <Title3>Recent uploads</Title3>
        <Card>
          {recent.length === 0 ? (
            <EmptyState icon="📥" title="No documents yet" description="Upload a document to get started." />
          ) : (
            <div className={styles.recent}>
              {recent.map((doc) => (
                <div
                  key={doc.id}
                  className={styles.row}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/documents/${doc.id}`);
                  }}
                >
                  <div className={styles.rowLeft}>
                    <Text weight="semibold" truncate>
                      {doc.documentName}
                    </Text>
                    <Text size={200}>{doc.documentTypeName ?? 'Unclassified'}</Text>
                  </div>
                  <div className={styles.rowBadges}>
                    {doc.flaggedForReview ? <Badge color="warning" appearance="tint">Flagged</Badge> : null}
                    <ProcessingStatusBadge status={doc.processingStatus} />
                    <ReviewStatusBadge status={doc.reviewStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
