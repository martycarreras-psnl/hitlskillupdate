// Small presentational helpers: empty states and loading skeletons.

import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    textAlign: 'center',
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
  emptyIcon: {
    fontSize: '40px',
    lineHeight: '1',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
  },
});

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden>
        {icon}
      </div>
      <Text weight="semibold" size={400}>
        {title}
      </Text>
      {description ? <Text size={200}>{description}</Text> : null}
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const styles = useStyles();
  return (
    <div className={styles.loading}>
      <Spinner label={label} />
    </div>
  );
}
