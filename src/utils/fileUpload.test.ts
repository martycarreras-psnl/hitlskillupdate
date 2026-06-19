import { describe, it, expect } from 'vitest';
import { isUploadableFile, partitionUploadableFiles } from './fileUpload';

describe('isUploadableFile', () => {
  it('accepts PDFs by MIME type and by extension', () => {
    expect(isUploadableFile({ name: 'a.pdf', type: 'application/pdf' })).toBe(true);
    expect(isUploadableFile({ name: 'a.PDF', type: '' })).toBe(true);
  });

  it('accepts images by MIME type and by extension', () => {
    expect(isUploadableFile({ name: 'a.png', type: 'image/png' })).toBe(true);
    expect(isUploadableFile({ name: 'scan.JPEG', type: '' })).toBe(true);
    expect(isUploadableFile({ name: 'fax.tiff', type: '' })).toBe(true);
  });

  it('rejects unsupported files', () => {
    expect(isUploadableFile({ name: 'notes.txt', type: 'text/plain' })).toBe(false);
    expect(isUploadableFile({ name: 'data.csv', type: '' })).toBe(false);
    expect(isUploadableFile({ name: 'archive.zip', type: 'application/zip' })).toBe(false);
  });
});

describe('partitionUploadableFiles', () => {
  it('splits accepted from rejected, preserving order', () => {
    const files = [
      { name: 'a.pdf', type: 'application/pdf' },
      { name: 'b.txt', type: 'text/plain' },
      { name: 'c.png', type: 'image/png' },
    ];
    const { accepted, rejected } = partitionUploadableFiles(files);
    expect(accepted.map((f) => f.name)).toEqual(['a.pdf', 'c.png']);
    expect(rejected.map((f) => f.name)).toEqual(['b.txt']);
  });

  it('handles an all-accepted and an all-rejected list', () => {
    expect(partitionUploadableFiles([{ name: 'a.pdf' }]).rejected).toEqual([]);
    expect(partitionUploadableFiles([{ name: 'a.txt' }]).accepted).toEqual([]);
  });
});
