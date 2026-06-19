// In-memory mock provider for the Phase 2 prototype. Implements the full AppDataProvider
// contract so screens behave exactly as they will against real Dataverse. The store is
// module-local and mutable; providerFactory returns a single shared instance so all
// hooks read and write the same data within a session.

import type {
  AppDataProvider,
  CreateDocumentInput,
  CreateSkillUpdateRequestInput,
  DocumentRepository,
  DocumentTypeRepository,
  ReviewSettingsRepository,
  SkillUpdateRequestRepository,
  SourceFileRef,
  SourceFileService,
} from '@/services/data-contracts';
import type {
  DocumentRecord,
  DocumentType,
  ReviewSettings,
  SkillUpdateRequest,
} from '@/types/domain-models';
import { SkillUpdateStatus } from '@/types/domain-models';
import { blobToDataUrl } from '@/lib/file-data-url';
import {
  seedDocumentTypes,
  seedDocuments,
  seedReviewSettings,
  seedSkillUpdateRequests,
} from '@/mockData/documents';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// Small artificial delay so loading skeletons and optimistic states are exercised.
function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function sampleAssetFor(mimeType: string | undefined): { url: string; mimeType: string } {
  const base = import.meta.env.BASE_URL ?? '/';
  if (mimeType === 'application/pdf') {
    return { url: `${base}sample-invoice.pdf`, mimeType: 'application/pdf' };
  }
  // Default to the sample receipt image (covers image/* mocks).
  return { url: `${base}sample-receipt.svg`, mimeType: 'image/svg+xml' };
}

interface MockStore {
  documents: DocumentRecord[];
  documentTypes: DocumentType[];
  reviewSettings: ReviewSettings;
  skillUpdateRequests: SkillUpdateRequest[];
  /**
   * Object URLs for blobs uploaded this session, keyed by document id. Kept out of
   * DocumentRecord because the record is JSON-cloned (which would destroy a File/Blob).
   */
  uploadedFiles: Map<string, Blob>;
}

function createStore(): MockStore {
  return {
    documents: clone(seedDocuments),
    documentTypes: clone(seedDocumentTypes),
    reviewSettings: clone(seedReviewSettings),
    skillUpdateRequests: clone(seedSkillUpdateRequests),
    uploadedFiles: new Map(),
  };
}

function createDocumentRepository(store: MockStore): DocumentRepository {
  return {
    async list() {
      const sorted = [...store.documents].sort((a, b) =>
        (b.createdOn ?? '').localeCompare(a.createdOn ?? ''),
      );
      return delay(clone(sorted));
    },
    async getById(id) {
      const record = store.documents.find((doc) => doc.id === id) ?? null;
      return delay(record ? clone(record) : null);
    },
    async create(input: CreateDocumentInput) {
      // Mimic the Dataverse autonumber (DOC-{yyyy}-{SEQNUM:5}) so the prototype
      // shows a friendly identifier on freshly uploaded documents too.
      const year = new Date().getFullYear();
      const seq = store.documents.length + 1;
      const documentNumber = `DOC-${year}-${String(seq).padStart(5, '0')}`;
      const record: DocumentRecord = {
        id: `doc-${crypto.randomUUID()}`,
        documentNumber,
        documentName: input.documentName,
        sourceFileName: input.sourceFileName,
        sourceFileMimeType: input.sourceFileMimeType,
        processingStatus: input.processingStatus,
        randomDrawValue: input.randomDrawValue,
        flaggedForReview: input.flaggedForReview,
        reviewStatus: input.reviewStatus,
        createdOn: new Date().toISOString(),
      };
      store.documents.unshift(record);
      // Retain the uploaded blob so the viewer can render the real file this session.
      if (input.sourceFile) {
        store.uploadedFiles.set(record.id, input.sourceFile);
      }
      return delay(clone(record));
    },
    async update(id, changes) {
      const index = store.documents.findIndex((doc) => doc.id === id);
      if (index < 0) throw new Error(`Document ${id} not found`);
      store.documents[index] = { ...store.documents[index], ...changes, id };
      return delay(clone(store.documents[index]));
    },
    async delete(id) {
      const index = store.documents.findIndex((doc) => doc.id === id);
      if (index < 0) throw new Error(`Document ${id} not found`);
      store.documents.splice(index, 1);
      store.uploadedFiles.delete(id);
      return delay(undefined);
    },
  };
}

function createDocumentTypeRepository(store: MockStore): DocumentTypeRepository {
  return {
    async list() {
      return delay(clone(store.documentTypes));
    },
    async create(input) {
      const record: DocumentType = { id: `type-${crypto.randomUUID()}`, ...input };
      store.documentTypes.push(record);
      return delay(clone(record));
    },
    async update(id, changes) {
      const index = store.documentTypes.findIndex((type) => type.id === id);
      if (index < 0) throw new Error(`Document Type ${id} not found`);
      store.documentTypes[index] = { ...store.documentTypes[index], ...changes, id };
      return delay(clone(store.documentTypes[index]));
    },
  };
}

function createReviewSettingsRepository(store: MockStore): ReviewSettingsRepository {
  return {
    async get() {
      return delay(clone(store.reviewSettings));
    },
    async update(changes) {
      store.reviewSettings = { ...store.reviewSettings, ...changes, id: store.reviewSettings.id };
      return delay(clone(store.reviewSettings));
    },
  };
}

function createSkillUpdateRequestRepository(store: MockStore): SkillUpdateRequestRepository {
  return {
    async list() {
      const sorted = [...store.skillUpdateRequests].sort((a, b) =>
        (b.requestedOn ?? '').localeCompare(a.requestedOn ?? ''),
      );
      return delay(clone(sorted));
    },
    async getById(id) {
      const record = store.skillUpdateRequests.find((r) => r.id === id) ?? null;
      return delay(record ? clone(record) : null);
    },
    async create(input: CreateSkillUpdateRequestInput) {
      // Mimic the Dataverse autonumber (SUR-{yyyy}-{SEQNUM:5}) so the prototype shows
      // a friendly identifier on freshly raised requests too.
      const year = new Date().getFullYear();
      const seq = store.skillUpdateRequests.length + 1;
      const skillUpdateNumber = `SUR-${year}-${String(seq).padStart(5, '0')}`;
      const record: SkillUpdateRequest = {
        id: `sur-${crypto.randomUUID()}`,
        skillUpdateNumber,
        name: `Skill update for ${input.documentName ?? input.documentId}`,
        documentId: input.documentId,
        documentName: input.documentName,
        documentTypeName: input.documentTypeName,
        suggestedFix: input.suggestedFix,
        status: SkillUpdateStatus.New,
        requestedOn: new Date().toISOString(),
      };
      store.skillUpdateRequests.unshift(record);
      return delay(clone(record));
    },
    async update(id, changes) {
      const index = store.skillUpdateRequests.findIndex((r) => r.id === id);
      if (index < 0) throw new Error(`Skill Update Request ${id} not found`);
      store.skillUpdateRequests[index] = { ...store.skillUpdateRequests[index], ...changes, id };
      return delay(clone(store.skillUpdateRequests[index]));
    },
  };
}

function createSourceFileService(store: MockStore): SourceFileService {
  // Cache one data URL per uploaded blob so repeated reads return a stable URL
  // instead of re-encoding the file on every read.
  const dataUrlCache = new Map<string, string>();
  return {
    async getSourceFileUrl(documentId): Promise<SourceFileRef | null> {
      const doc = store.documents.find((d) => d.id === documentId);
      if (!doc || !doc.sourceFileName) return null;
      // Prefer the real uploaded blob (served as a data: URL so it renders under the
      // deployed host CSP) when one exists this session; seeded demo records fall back
      // to a bundled sample asset.
      const blob = store.uploadedFiles.get(documentId);
      if (blob) {
        let url = dataUrlCache.get(documentId);
        if (!url) {
          url = await blobToDataUrl(blob);
          dataUrlCache.set(documentId, url);
        }
        return delay({
          url,
          mimeType: doc.sourceFileMimeType || blob.type || 'application/octet-stream',
          fileName: doc.sourceFileName,
        });
      }
      const asset = sampleAssetFor(doc.sourceFileMimeType);
      return delay({
        url: asset.url,
        mimeType: doc.sourceFileMimeType ?? asset.mimeType,
        fileName: doc.sourceFileName,
      });
    },
  };
}

export function createMockDataProvider(): AppDataProvider {
  const store = createStore();
  return {
    documents: createDocumentRepository(store),
    documentTypes: createDocumentTypeRepository(store),
    reviewSettings: createReviewSettingsRepository(store),
    skillUpdateRequests: createSkillUpdateRequestRepository(store),
    sourceFiles: createSourceFileService(store),
    fieldMetadata: {
      async getField() {
        return null;
      },
    },
  } satisfies AppDataProvider;
}
