// Review Queue — the actionable list is anything that needs a human (per reviewQueue
// rules): randomly-sampled documents the agent has finished, AND documents that FAILED
// processing. A reason badge distinguishes the two. Flagged-but-not-yet-processed
// documents are shown separately as "waiting for processing".

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
import { ProcessingStatusBadge, ReviewReasonBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { isActionableReview, isAwaitingProcessing, reviewReason } from '@/utils/reviewQueue';

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
  badgeRight: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
});

export function ReviewQueuePage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();

  const actionable = useMemo(
    () => (documents ?? []).filter(isActionableReview),
    [documents],
  );

  const waiting = useMemo(
    () => (documents ?? []).filter(isAwaitingProcessing),
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
              description="No randomly-sampled or failed documents are waiting right now."
            />
          ) : (
            <Table aria-label="Review queue">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Reason</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Drawn</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionable.map((doc) => {
                  const reason = reviewReason(doc)!;
                  return (
                    <TableRow
                      key={doc.id}
                      className={styles.clickableRow}
                      onClick={() => navigate(`/review/${doc.id}`)}
                    >
                      <TableCell>{doc.documentName}</TableCell>
                      <TableCell>
                        <ReviewReasonBadge reason={reason} />
                      </TableCell>
                      <TableCell>{doc.documentTypeName ?? '—'}</TableCell>
                      <TableCell>{reason === 'sampled' ? (doc.randomDrawValue ?? '—') : '—'}</TableCell>
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
                  );
                })}
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
                  <div className={styles.badgeRight}>
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
