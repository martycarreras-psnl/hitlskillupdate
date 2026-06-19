// React Query hooks over the AppDataProvider contract. Components consume these and
// never touch the provider (or generated services) directly. (three-layer architecture)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAppDataProvider } from '@/services/providerFactory';
import { computeReviewDraw } from '@/utils/randomDraw';
import type {
  DocumentRecord,
  DocumentType,
  ReviewSettings,
  SkillUpdateRequest,
} from '@/types/domain-models';
import type { CreateSkillUpdateRequestInput } from '@/services/data-contracts';

const provider = createAppDataProvider();

export const queryKeys = {
  documents: ['documents', 'list'] as const,
  document: (id: string) => ['documents', 'detail', id] as const,
  documentTypes: ['documentTypes'] as const,
  reviewSettings: ['reviewSettings'] as const,
  skillUpdateRequests: ['skillUpdateRequests'] as const,
  sourceFile: (id: string) => ['sourceFile', id] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => provider.documents.list(),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.document(id ?? 'new'),
    queryFn: () => (id ? provider.documents.getById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: queryKeys.documentTypes,
    queryFn: () => provider.documentTypes.list(),
  });
}

export function useReviewSettings() {
  return useQuery({
    queryKey: queryKeys.reviewSettings,
    queryFn: () => provider.reviewSettings.get(),
  });
}

export function useSourceFileUrl(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sourceFile(id ?? 'none'),
    queryFn: () => (id ? provider.sourceFiles.getSourceFileUrl(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useSkillUpdateRequests() {
  return useQuery({
    queryKey: queryKeys.skillUpdateRequests,
    queryFn: () => provider.skillUpdateRequests.list(),
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface UploadDocumentInput {
  file: File;
}

/**
 * Create a Document from an uploaded file. Runs the review draw against the current
 * Review Settings, captures the drawn value, flags the record when it matches the
 * Trigger Value, and sets Processing Status = Queued for the external flow.
 */
export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file }: UploadDocumentInput) => {
      const settings = await provider.reviewSettings.get();
      const draw = computeReviewDraw(settings);
      return provider.documents.create({
        documentName: file.name,
        sourceFileName: file.name,
        sourceFileMimeType: file.type || 'application/octet-stream',
        sourceFile: file,
        randomDrawValue: draw.randomDrawValue,
        flaggedForReview: draw.flaggedForReview,
        reviewStatus: draw.reviewStatus,
        processingStatus: draw.processingStatus,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<DocumentRecord> }) =>
      provider.documents.update(id, changes),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.document(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });
}

export function useUpdateReviewSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<ReviewSettings>) => provider.reviewSettings.update(changes),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.reviewSettings, updated);
    },
  });
}

export function useCreateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<DocumentType, 'id'>) => provider.documentTypes.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documentTypes }),
  });
}

export function useUpdateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<DocumentType> }) =>
      provider.documentTypes.update(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documentTypes }),
  });
}

export function useCreateSkillUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillUpdateRequestInput) =>
      provider.skillUpdateRequests.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.skillUpdateRequests }),
  });
}

export function useUpdateSkillUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<SkillUpdateRequest> }) =>
      provider.skillUpdateRequests.update(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.skillUpdateRequests }),
  });
}
