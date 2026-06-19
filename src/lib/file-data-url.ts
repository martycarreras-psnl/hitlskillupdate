// Convert a Blob/File to a base64 `data:` URL. Used by the data providers to serve
// stored Source Files. The deployed Power Apps host enforces a strict Content Security
// Policy (`img-src 'self' data:`), which blocks `blob:` URLs but permits `data:` URLs —
// so images render inline only when delivered as data URLs.
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}
