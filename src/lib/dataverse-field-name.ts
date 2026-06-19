// Maps a domain-model key to its Dataverse column logical name. Every custom column
// uses the publisher prefix + the key lowercased. Columns that break the convention
// (e.g. OOTB attributes) must pass an explicit fieldLogicalName at the call site.

export const DATAVERSE_PREFIX = 'msfthitl_';

export function toDataverseFieldName(key: string | undefined | null): string | undefined {
  if (!key) return undefined;
  if (key.startsWith(DATAVERSE_PREFIX)) return key.toLowerCase();
  return `${DATAVERSE_PREFIX}${key.toLowerCase()}`;
}
