// Review Queue — the actionable list is Flagged AND Processed AND Pending Review (you
// can't review before the Agent fills in the JSON). Flagged-but-not-yet-processed
// documents are shown separately as "waiting for processing", not as actionable work.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useDocuments } from '@/hooks/useDocuments';
import { ProcessingStatus, ReviewStatus } from '@/types/domain-models';
import { ProcessingStatusBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  clickableRow: { cursor: 'pointer' },
  waiting: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  waitingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
  },
});

export function ReviewQueuePage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();

  const actionable = useMemo(
    () =>
      (documents ?? []).filter(
        (doc) =>
          doc.flaggedForReview &&
          doc.processingStatus === ProcessingStatus.Processed &&
          doc.reviewStatus === ReviewStatus.PendingReview,
      ),
    [documents],
  );

  const waiting = useMemo(
    () =>
      (documents ?? []).filter(
        (doc) =>
          doc.flaggedForReview &&
          doc.processingStatus !== ProcessingStatus.Processed &&
          (doc.reviewStatus === ReviewStatus.PendingReview ||
            doc.reviewStatus === ReviewStatus.NotRequired),
      ),
    [documents],
  );

  if (isLoading) return <LoadingState />;

  return (
    <div className={styles.root}>
      <div className={styles.section}>
        <Title2>Review Queue</Title2>
        <Card>
          {actionable.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Nothing to review"
              description="No flagged, processed documents are pending review right now."
            />
          ) : (
            <Table aria-label="Review queue">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Drawn</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionable.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className={styles.clickableRow}
                    onClick={() => navigate(`/review/${doc.id}`)}
                  >
                    <TableCell>{doc.documentName}</TableCell>
                    <TableCell>{doc.documentTypeName ?? '—'}</TableCell>
                    <TableCell>{doc.randomDrawValue ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        appearance="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/review/${doc.id}`);
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {waiting.length > 0 ? (
        <div className={styles.section}>
          <Title3>Flagged · waiting for processing</Title3>
          <Card>
            <div className={styles.waiting}>
              {waiting.map((doc) => (
                <div key={doc.id} className={styles.waitingRow}>
                  <Text>{doc.documentName}</Text>
                  <div style={{ display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' }}>
                    <Badge color="warning" appearance="tint">
                      Flagged
                    </Badge>
                    <ProcessingStatusBadge status={doc.processingStatus} />
                    <Button size="small" appearance="subtle" onClick={() => navigate(`/documents/${doc.id}`)}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
