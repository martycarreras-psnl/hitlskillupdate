// Shared, metadata-backed label primitive for Dataverse-bound editable fields. The
// required asterisk is driven by the column's Dataverse RequiredLevel (via metadata),
// never hardcoded. Use this for every editable field that writes to a Dataverse column,
// and for client-only fields that should share the same required-indicator styling.
// (See .github/instructions/09-form-field-pattern.instructions.md.)

import type { ReactNode } from 'react';
import { Label, tokens, type LabelProps } from '@fluentui/react-components';
import { useDataverseFieldMetadata } from '@/hooks/useFieldMetadata';

export interface DataverseFieldLabelProps extends Omit<LabelProps, 'children'> {
  /** Dataverse table logical name (e.g. `msfthitl_reviewsetting`). Omit for client-only fields. */
  tableLogicalName?: string;
  /** Dataverse column logical name (e.g. `msfthitl_rangemin`). Omit for client-only fields. */
  fieldLogicalName?: string;
  /** Display text used when metadata is unavailable (mock provider, or client-only field). */
  fallback?: string;
  /** Force the required indicator for client-only fields not backed by Dataverse metadata. */
  required?: boolean;
  children?: ReactNode;
}

export function DataverseFieldLabel({
  tableLogicalName,
  fieldLogicalName,
  fallback,
  required,
  children,
  ...rest
}: DataverseFieldLabelProps) {
  const { data } = useDataverseFieldMetadata(tableLogicalName ?? '', fieldLogicalName ?? '');
  const text = data?.displayName ?? fallback ?? children;
  const isRequired = data?.isRequired ?? required ?? false;
  return (
    <Label {...rest}>
      {text}
      {isRequired ? (
        <span aria-hidden="true" style={{ color: tokens.colorPaletteRedForeground1, marginInlineStart: '2px' }}>
          *
        </span>
      ) : null}
    </Label>
  );
}

export function useDataverseFieldRequired(
  tableLogicalName: string | undefined,
  fieldLogicalName: string | undefined,
  fallback?: boolean,
): boolean {
  const { data } = useDataverseFieldMetadata(tableLogicalName ?? '', fieldLogicalName ?? '');
  return data?.isRequired ?? fallback ?? false;
}
