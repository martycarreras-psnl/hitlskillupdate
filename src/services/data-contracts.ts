// Provider contracts are the seam between mock UX and real connectors.
// Components and hooks depend ONLY on these interfaces; the mock provider and the
// (later) real Dataverse provider both implement them. (three-layer architecture)

import type {
  DocumentRecord,
  DocumentType,
  ReviewSettings,
  SkillUpdateRequest,
} from '@/types/domain-models';

export type DataverseFieldRequiredLevel = 'none' | 'recommended' | 'application' | 'system';

export interface DataverseFieldMetadata {
  tableLogicalName: string;
  fieldLogicalName: string;
  displayName?: string;
  requiredLevel: DataverseFieldRequiredLevel;
  isRequired: boolean;
  maxLength?: number;   // String/Memo columns
  minValue?: number;    // Money/Decimal/Integer columns
  maxValue?: number;    // Money/Decimal/Integer columns
  precision?: number;   // Money/Decimal columns
}

export interface FieldMetadataRepository {
  getField(tableLogicalName: string, fieldLogicalName: string): Promise<DataverseFieldMetadata | null>;
}

/** Fields the app supplies when creating a Document (after the review draw runs). */
export interface CreateDocumentInput {
  documentName: string;
  sourceFileName?: string;
  sourceFileMimeType?: string;
  randomDrawValue: number;
  flaggedForReview: boolean;
  reviewStatus: DocumentRecord['reviewStatus'];
  processingStatus: DocumentRecord['processingStatus'];
}

export interface DocumentRepository {
  list(): Promise<DocumentRecord[]>;
  getById(id: string): Promise<DocumentRecord | null>;
  create(input: CreateDocumentInput): Promise<DocumentRecord>;
  update(id: string, changes: Partial<DocumentRecord>): Promise<DocumentRecord>;
}

export interface DocumentTypeRepository {
  list(): Promise<DocumentType[]>;
  create(input: Omit<DocumentType, 'id'>): Promise<DocumentType>;
  update(id: string, changes: Partial<DocumentType>): Promise<DocumentType>;
}

export interface ReviewSettingsRepository {
  /** The single configuration row (created on first read if absent). */
  get(): Promise<ReviewSettings>;
  update(changes: Partial<ReviewSettings>): Promise<ReviewSettings>;
}

/** A resolvable reference to a Document's stored Source File. */
export interface SourceFileRef {
  url: string;
  mimeType: string;
  fileName: string;
}

export interface SourceFileService {
  /** Resolve a displayable URL for a Document's Source File, or null if none stored. */
  getSourceFileUrl(documentId: string): Promise<SourceFileRef | null>;
}

/** Fields supplied when a reviewer raises a Skill Update Request on rejection. */
export interface CreateSkillUpdateRequestInput {
  documentId: string;
  documentName?: string;
  documentTypeName?: string;
  suggestedFix: string;
}

export interface SkillUpdateRequestRepository {
  list(): Promise<SkillUpdateRequest[]>;
  getById(id: string): Promise<SkillUpdateRequest | null>;
  create(input: CreateSkillUpdateRequestInput): Promise<SkillUpdateRequest>;
  update(id: string, changes: Partial<SkillUpdateRequest>): Promise<SkillUpdateRequest>;
}

export interface AppDataProvider {
  documents: DocumentRepository;
  documentTypes: DocumentTypeRepository;
  reviewSettings: ReviewSettingsRepository;
  skillUpdateRequests: SkillUpdateRequestRepository;
  sourceFiles: SourceFileService;
  fieldMetadata: FieldMetadataRepository;
}
