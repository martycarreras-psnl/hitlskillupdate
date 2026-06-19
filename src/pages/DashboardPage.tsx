// Dashboard — a greeting hero, a gradient review-status banner, headline stat cards,
// and two columns (recent uploads + the actionable review queue). Styled to match the
// app's navy/blue design language.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowUpload24Regular,
  CheckmarkCircle24Regular,
  ClipboardTask24Regular,
  DocumentMultiple24Regular,
  Flag24Regular,
  Warning24Regular,
} from '@fluentui/react-icons';
import { useDocuments } from '@/hooks/useDocuments';
import { useRole } from '@/hooks/useRole';
import { ProcessingStatus, ReviewStatus, type DocumentRecord } from '@/types/domain-models';
import { canReview } from '@/constants/status';
import { ProcessingStatusBadge, ReviewStatusBadge } from '@/components/StatusBadge';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { surfaces } from '@/theme';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },

  // Greeting
  greetRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  greetTitle: { fontSize: tokens.fontSizeHero700, fontWeight: tokens.fontWeightBold, lineHeight: '1.1' },
  greetSub: { color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalXS },
  greetActions: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },

  // Hero banner
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap',
    backgroundImage: surfaces.heroGradient,
    borderRadius: tokens.borderRadiusXLarge,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    boxShadow: tokens.shadow16,
  },
  heroLeft: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalL, minWidth: 0 },
  heroIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: surfaces.onDark,
    flexShrink: 0,
  },
  heroText: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  heroTitle: { color: surfaces.onDark, fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
  heroSub: { color: surfaces.onDarkMuted, fontSize: tokens.fontSizeBase200 },

  // Stat cards
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalL,
  },
  statHead: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
  },
  statLabel: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  statValue: { fontSize: '34px', fontWeight: tokens.fontWeightBold, lineHeight: '1' },
  statSub: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  statAccentDanger: { color: tokens.colorPaletteRedForeground1 },
  statAccentWarning: { color: tokens.colorPaletteDarkOrangeForeground1 },

  // Two columns
  columns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: tokens.spacingHorizontalL,
    alignItems: 'start',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, padding: tokens.spacingHorizontalL },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalXS,
  },
  panelTitle: { fontSize: tokens.fontSizeBase400, fontWeight: tokens.fontWeightSemibold },
  list: { display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  rowMain: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flexGrow: 1 },
  rowName: { fontWeight: tokens.fontWeightSemibold },
  rowMeta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  rowBadges: { display: 'flex', gap: tokens.spacingHorizontalXS, flexShrink: 0, alignItems: 'center' },
  drawChip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28px',
    height: '28px',
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase200,
    flexShrink: 0,
  },
});

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function isActionableReview(doc: DocumentRecord): boolean {
  return (
    doc.flaggedForReview &&
    doc.processingStatus === ProcessingStatus.Processed &&
    doc.reviewStatus === ReviewStatus.PendingReview
  );
}

export function DashboardPage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { role } = useRole();
  const { data: documents, isLoading } = useDocuments();

  const stats = useMemo(() => {
    const docs = documents ?? [];
    let processed = 0;
    let failed = 0;
    let flagged = 0;
    let backlog = 0;
    for (const doc of docs) {
      if (doc.processingStatus === ProcessingStatus.Processed) processed += 1;
      if (doc.processingStatus === ProcessingStatus.Failed) failed += 1;
      if (doc.flaggedForReview) flagged += 1;
      if (isActionableReview(doc)) backlog += 1;
    }
    return { total: docs.length, processed, failed, flagged, backlog };
  }, [documents]);

  const recent = useMemo(() => (documents ?? []).slice(0, 5), [documents]);
  const awaiting = useMemo(
    () => (documents ?? []).filter(isActionableReview).slice(0, 5),
    [documents],
  );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className={styles.root}>
      <div className={styles.greetRow}>
        <div>
          <div className={styles.greetTitle}>{greetingForHour(new Date().getHours())}</div>
          <Text className={styles.greetSub}>
            {today} · {stats.total} document{stats.total === 1 ? '' : 's'} ·{' '}
            {stats.backlog} awaiting review
          </Text>
        </div>
        <div className={styles.greetActions}>
          <Button appearance="primary" icon={<ArrowUpload24Regular />} onClick={() => navigate('/documents')}>
            Upload document
          </Button>
          {canReview(role) ? (
            <Button icon={<ClipboardTask24Regular />} onClick={() => navigate('/review')}>
              Review queue
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroIcon}>
            <ClipboardTask24Regular />
          </span>
          <div className={styles.heroText}>
            <span className={styles.heroTitle}>
              {stats.backlog > 0
                ? `${stats.backlog} document${stats.backlog === 1 ? '' : 's'} awaiting review`
                : 'Review queue clear'}
            </span>
            <span className={styles.heroSub}>
              {stats.backlog > 0
                ? 'Flagged, processed, and ready for a human reviewer.'
                : 'Nothing flagged and processed is waiting right now.'}
            </span>
          </div>
        </div>
        {canReview(role) ? (
          <Button appearance="primary" onClick={() => navigate('/review')}>
            Start reviewing
          </Button>
        ) : null}
      </div>

      <div className={styles.cards}>
        <Card className={styles.statCard}>
          <div className={styles.statHead}>
            <DocumentMultiple24Regular />
            <span className={styles.statLabel}>Documents</span>
          </div>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statSub}>Total in the system</span>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statHead}>
            <ClipboardTask24Regular />
            <span className={styles.statLabel}>Awaiting review</span>
          </div>
          <span className={styles.statValue}>{stats.backlog}</span>
          <span className={styles.statSub}>Flagged · processed · pending</span>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statHead}>
            <CheckmarkCircle24Regular />
            <span className={styles.statLabel}>Processed</span>
          </div>
          <span className={styles.statValue}>{stats.processed}</span>
          <span className={styles.statSub}>Extracted by the agent</span>
        </Card>

        <Card className={styles.statCard}>
          <div className={`${styles.statHead} ${styles.statAccentDanger}`}>
            <Warning24Regular />
            <span className={styles.statLabel}>Needs attention</span>
          </div>
          <span className={`${styles.statValue} ${styles.statAccentDanger}`}>{stats.failed}</span>
          <span className={styles.statSub}>Failed processing</span>
        </Card>
      </div>

      <div className={styles.columns}>
        <Card className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Recent uploads</span>
            <Button appearance="transparent" size="small" onClick={() => navigate('/documents')}>
              View all
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="📥" title="No documents yet" description="Upload a document to get started." />
          ) : (
            <div className={styles.list}>
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
                  <Avatar
                    shape="square"
                    color="colorful"
                    idForColor={doc.documentTypeName ?? 'Unclassified'}
                    name={doc.documentTypeName ?? 'Document'}
                    aria-hidden
                  />
                  <div className={styles.rowMain}>
                    <Text className={styles.rowName} truncate>
                      {doc.documentName}
                    </Text>
                    <Text className={styles.rowMeta}>{doc.documentTypeName ?? 'Unclassified'}</Text>
                  </div>
                  <div className={styles.rowBadges}>
                    {doc.flaggedForReview ? <Flag24Regular aria-label="Flagged" /> : null}
                    <ProcessingStatusBadge status={doc.processingStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Awaiting review</span>
            {canReview(role) ? (
              <Button appearance="transparent" size="small" onClick={() => navigate('/review')}>
                Open queue
              </Button>
            ) : null}
          </div>
          {awaiting.length === 0 ? (
            <EmptyState icon="✅" title="All caught up" description="No documents are pending review." />
          ) : (
            <div className={styles.list}>
              {awaiting.map((doc) => (
                <div
                  key={doc.id}
                  className={styles.row}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(canReview(role) ? `/review/${doc.id}` : `/documents/${doc.id}`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      navigate(canReview(role) ? `/review/${doc.id}` : `/documents/${doc.id}`);
                    }
                  }}
                >
                  <Avatar
                    color="colorful"
                    idForColor={doc.id}
                    name={doc.documentName}
                    aria-hidden
                  />
                  <div className={styles.rowMain}>
                    <Text className={styles.rowName} truncate>
                      {doc.documentName}
                    </Text>
                    <Text className={styles.rowMeta}>{doc.documentTypeName ?? 'Unclassified'}</Text>
                  </div>
                  <div className={styles.rowBadges}>
                    <ReviewStatusBadge status={doc.reviewStatus} />
                    {doc.randomDrawValue != null ? (
                      <span className={styles.drawChip} aria-label={`Drew ${doc.randomDrawValue}`}>
                        {doc.randomDrawValue}
                      </span>
                    ) : null}
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
