// Pure helpers for the multi-file upload / drag-and-drop flow. Kept free of React so
// the accept rules can be unit-tested. The app accepts PDFs and images (the same set
// as the file picker's accept=".pdf,image/*").

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic'];

/** True when a file looks like a PDF or image, by MIME type or extension. */
export function isUploadableFile(file: { name: string; type?: string }): boolean {
  const type = (file.type ?? '').toLowerCase();
  if (type === 'application/pdf') return true;
  if (type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'pdf' || IMAGE_EXT.includes(ext);
}

export interface PartitionedFiles<T> {
  accepted: T[];
  rejected: T[];
}

/** Split a list of files into accepted (uploadable) and rejected (unsupported). */
export function partitionUploadableFiles<T extends { name: string; type?: string }>(
  files: T[],
): PartitionedFiles<T> {
  const accepted: T[] = [];
  const rejected: T[] = [];
  for (const file of files) {
    (isUploadableFile(file) ? accepted : rejected).push(file);
  }
  return { accepted, rejected };
}
