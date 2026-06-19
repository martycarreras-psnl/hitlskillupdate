// Source File viewer. Resolves the stored file via the provider's getSourceFileUrl
// (mock returns a sample asset; real returns the Dataverse File-column download URL)
// and renders images inline and PDFs via <object> with a graceful download fallback.

import {
  Button,
  Card,
  Link,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Open16Regular } from '@fluentui/react-icons';
import { useSourceFileUrl } from '@/hooks/useDocuments';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { PdfCanvasViewer } from '@/components/PdfCanvasViewer';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  image: {
    width: '100%',
    maxHeight: '520px',
    objectFit: 'contain',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  fallback: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    alignItems: 'flex-start',
  },
});

export function SourceFileViewer({ documentId }: { documentId: string }) {
  const styles = useStyles();
  const { data, isLoading, isError } = useSourceFileUrl(documentId);

  if (isLoading) return <LoadingState label="Loading source file…" />;
  if (isError) {
    return <EmptyState icon="⚠️" title="Could not load the source file" />;
  }
  if (!data) {
    return <EmptyState icon="📄" title="No source file" description="This document has no stored file." />;
  }

  const isImage = data.mimeType.startsWith('image/');
  const isPdf = data.mimeType === 'application/pdf';

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Text weight="semibold" truncate>
          {data.fileName}
        </Text>
        <Button
          as="a"
          href={data.url}
          download={data.fileName}
          appearance="subtle"
          size="small"
          icon={<Open16Regular />}
        >
          Download
        </Button>
      </div>

      {isImage ? (
        <img className={styles.image} src={data.url} alt={data.fileName} />
      ) : isPdf ? (
        <>
          <PdfCanvasViewer url={data.url} fileName={data.fileName} />
          <div className={styles.fallback}>
            <Link href={data.url} download={data.fileName}>
              Download {data.fileName}
            </Link>
          </div>
        </>
      ) : (
        <div className={styles.fallback}>
          <Text>Preview isn’t available for this file type.</Text>
          <Link href={data.url} download={data.fileName}>
            Download {data.fileName}
          </Link>
        </div>
      )}
    </Card>
  );
}
