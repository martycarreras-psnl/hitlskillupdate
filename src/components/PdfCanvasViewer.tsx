// Renders a PDF to <canvas> using PDF.js. The deployed Power Apps host CSP
// (`frame-src 'self'`) blocks <iframe>/<object>/<embed> PDF preview, but a
// canvas is governed by script-src/worker-src, so this path works inline in
// both local dev and the deployed host. Bytes come from a data: URL (decoded
// locally — no network fetch) produced by the data providers.

import { useEffect, useRef, useState } from 'react';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves this to a same-origin URL, satisfying the host's worker-src 'self'.
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { LoadingState } from '@/components/EmptyState';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxHeight: '520px',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalS,
    alignItems: 'center',
  },
  canvas: {
    width: '100%',
    height: 'auto',
    boxShadow: tokens.shadow4,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: '#fff',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    alignItems: 'flex-start',
    padding: tokens.spacingHorizontalM,
  },
});

/** Decode a base64 `data:` URL to a byte array without a network request. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (meta.includes(';base64')) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
}

export interface PdfCanvasViewerProps {
  /** A `data:` URL (or any URL PDF.js can load) for the PDF. */
  url: string;
  fileName: string;
  /** Cap the number of pages rendered (keeps memory bounded). Default 10. */
  maxPages?: number;
}

export function PdfCanvasViewer({ url, fileName, maxPages = 10 }: PdfCanvasViewerProps) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();
    setStatus('loading');

    // data: URLs are decoded locally (no network); any other URL (e.g. the bundled
    // sample asset in the mock prototype) is handed to PDF.js to fetch same-origin.
    const source = url.startsWith('data:')
      ? { data: dataUrlToBytes(url) }
      : { url };
    const task = pdfjsLib.getDocument({
      ...source,
      isEvalSupported: false, // avoid eval — stays within strict CSP
    });

    task.promise
      .then(async (pdf) => {
        const pageCount = Math.min(pdf.numPages, maxPages);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.className = styles.canvas;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          ctx.scale(dpr, dpr);
          if (cancelled) return;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [url, maxPages, styles.canvas]);

  if (status === 'error') {
    return (
      <div className={styles.error}>
        <Text>Couldn’t render this PDF inline.</Text>
        <Button as="a" href={url} download={fileName} appearance="primary" size="small">
          Download {fileName}
        </Button>
      </div>
    );
  }

  return (
    <>
      {status === 'loading' ? <LoadingState label="Rendering PDF…" /> : null}
      <div ref={containerRef} className={styles.root} aria-label={fileName} />
    </>
  );
}
