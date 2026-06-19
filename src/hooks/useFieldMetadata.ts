// TanStack Query hook over the provider's FieldMetadataRepository. Reads live Dataverse
// column metadata (required level, maxLength, min/max) so editable labels reflect each
// column's RequiredLevel without per-field hardcoding. Uses the same shared provider
// instance as the other hooks (three-layer architecture).

import { useQuery } from '@tanstack/react-query';
import { createAppDataProvider } from '@/services/providerFactory';

const provider = createAppDataProvider();

export function useDataverseFieldMetadata(tableLogicalName: string, fieldLogicalName: string) {
  return useQuery({
    queryKey: ['fieldMetadata', tableLogicalName, fieldLogicalName],
    enabled: Boolean(tableLogicalName) && Boolean(fieldLogicalName),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: () => provider.fieldMetadata.getField(tableLogicalName, fieldLogicalName),
  });
}
