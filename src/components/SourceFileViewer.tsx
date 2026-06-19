// Source File viewer. Resolves the stored file via the provider's getSourceFileUrl
// (mock returns a sample asset; real returns the Dataverse File-column download URL)
// and renders images inline; PDFs render to <canvas> via a lazily-loaded PDF.js
// viewer (keeps pdf.js out of the main bundle), with a download fallback.

import { Suspense, lazy, useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Link,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Dismiss24Regular,
  Open16Regular,
  ZoomIn24Regular,
  ZoomOut24Regular,
} from '@fluentui/react-icons';
import { useSourceFileUrl } from '@/hooks/useDocuments';
import { EmptyState, LoadingState } from '@/components/EmptyState';

// pdf.js is ~350 KB gzipped; load it only when a PDF is actually viewed.
const PdfCanvasViewer = lazy(() =>
  import('@/components/PdfCanvasViewer').then((m) => ({ default: m.PdfCanvasViewer })),
);

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
    cursor: 'zoom-in',
  },
  fallback: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    alignItems: 'flex-start',
  },
  zoomSurface: {
    maxWidth: '95vw',
    width: 'fit-content',
  },
  zoomViewport: {
    maxHeight: '78vh',
    overflow: 'auto',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    justifyContent: 'center',
  },
  zoomImage: {
    display: 'block',
    transformOrigin: 'top center',
    transition: 'width 0.1s ease',
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
});

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

function ImageZoomDialog({ url, fileName }: { url: string; fileName: string }) {
  const styles = useStyles();
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];

  return (
    <Dialog>
      <DialogTrigger disableButtonEnhancement>
        <Tooltip content="Click to enlarge" relationship="label">
          <img
            className={styles.image}
            src={url}
            alt={fileName}
            role="button"
            tabIndex={0}
          />
        </Tooltip>
      </DialogTrigger>
      <DialogSurface className={styles.zoomSurface}>
        <DialogBody>
          <DialogTitle
            action={
              <div className={styles.zoomControls}>
                <Tooltip content="Zoom out" relationship="label">
                  <Button
                    appearance="subtle"
                    icon={<ZoomOut24Regular />}
                    disabled={zoomIndex === 0}
                    onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                    aria-label="Zoom out"
                  />
                </Tooltip>
                <Text>{Math.round(zoom * 100)}%</Text>
                <Tooltip content="Zoom in" relationship="label">
                  <Button
                    appearance="subtle"
                    icon={<ZoomIn24Regular />}
                    disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                    onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
                    aria-label="Zoom in"
                  />
                </Tooltip>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="subtle" icon={<Dismiss24Regular />} aria-label="Close" />
                </DialogTrigger>
              </div>
            }
          >
            {fileName}
          </DialogTitle>
          <DialogContent>
            <div className={styles.zoomViewport}>
              <img
                className={styles.zoomImage}
                src={url}
                alt={fileName}
                style={{ width: `${zoom * 100}%`, cursor: zoomIndex === ZOOM_LEVELS.length - 1 ? 'zoom-out' : 'zoom-in' }}
                onClick={() =>
                  setZoomIndex((i) => (i === ZOOM_LEVELS.length - 1 ? 0 : i + 1))
                }
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Link href={url} download={fileName}>
              Download {fileName}
            </Link>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

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
        <ImageZoomDialog url={data.url} fileName={data.fileName} />
      ) : isPdf ? (
        <>
          <Suspense fallback={<LoadingState label="Loading PDF viewer…" />}>
            <PdfCanvasViewer url={data.url} fileName={data.fileName} />
          </Suspense>
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
