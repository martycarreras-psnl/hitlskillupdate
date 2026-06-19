// Real Dataverse provider (Phase 4). Implements the same AppDataProvider contract as the
// mock provider by wrapping the generated services in adapters that map connector records
// to/from the domain models. Components and hooks are untouched by the swap — they depend
// only on the contract (three-layer architecture). Generated services in src/generated/**
// are read-only; this file is the adapter layer over them.

import { getClient } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo';

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
import { getFieldMetadata } from '@/services/field-metadata-cache';
import { blobToDataUrl } from '@/lib/file-data-url';
import type {
  DocumentRecord,
  DocumentType,
  ReviewSettings,
  SkillUpdateRequest,
} from '@/types/domain-models';
import { ProcessingStatus, ReviewStatus, SkillUpdateStatus } from '@/types/domain-models';

import { Msfthitl_documentsService } from '@/generated/services/Msfthitl_documentsService';
import { Msfthitl_documenttypesService } from '@/generated/services/Msfthitl_documenttypesService';
import { Msfthitl_reviewsettingsService } from '@/generated/services/Msfthitl_reviewsettingsService';
import { Msfthitl_skillupdaterequestsService } from '@/generated/services/Msfthitl_skillupdaterequestsService';
import type {
  Msfthitl_documents,
  Msfthitl_documentsBase,
} from '@/generated/models/Msfthitl_documentsModel';
import type { Msfthitl_documenttypes } from '@/generated/models/Msfthitl_documenttypesModel';
import type { Msfthitl_reviewsettings } from '@/generated/models/Msfthitl_reviewsettingsModel';
import type { Msfthitl_skillupdaterequests } from '@/generated/models/Msfthitl_skillupdaterequestsModel';

// Shared data client for file-column operations the generated services don't expose.
const client = getClient(dataSourcesInfo);

const DOCUMENTS = 'msfthitl_documents';
const SOURCE_FILE_COLUMN = 'msfthitl_sourcefile';
const DOCUMENT_TYPES_SET = 'msfthitl_documenttypes';
const DOCUMENTS_SET = 'msfthitl_documents';

function unwrap<T>(result: { data?: T; error?: unknown }, what: string): T {
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`${what} failed: ${message}`);
  }
  return result.data as T;
}

function parseExtractedData(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function mimeFromName(fileName: string | undefined): string {
  const ext = (fileName ?? '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

// ── Document ───────────────────────────────────────────────────────────────────

function toDocument(rec: Msfthitl_documents): DocumentRecord {
  return {
    id: rec.msfthitl_documentid,
    // Autonumber column added after the model was generated; read it via a narrow
    // cast (Dataverse returns it in the record JSON). msfthitl_documentnumber.
    documentNumber:
      (rec as { msfthitl_documentnumber?: string }).msfthitl_documentnumber ?? undefined,
    documentName: rec.msfthitl_documentname,
    sourceFileName: rec.msfthitl_sourcefile_name ?? rec.msfthitl_sourcefile ?? undefined,
    sourceFileMimeType: rec.msfthitl_sourcefile_name
      ? mimeFromName(rec.msfthitl_sourcefile_name)
      : undefined,
    documentTypeId: rec._msfthitl_documenttypeid_value ?? undefined,
    documentTypeName: rec.msfthitl_documenttypeidname ?? undefined,
    processingStatus: Number(rec.msfthitl_processingstatus) as ProcessingStatus,
    extractedData: parseExtractedData(rec.msfthitl_extracteddata),
    randomDrawValue: rec.msfthitl_randomdrawvalue ?? undefined,
    flaggedForReview: rec.msfthitl_flaggedforreview ?? false,
    reviewStatus:
      rec.msfthitl_reviewstatus != null
        ? (Number(rec.msfthitl_reviewstatus) as ReviewStatus)
        : ReviewStatus.NotRequired,
    reviewComment: rec.msfthitl_reviewcomment ?? undefined,
    processingError: rec.msfthitl_processingerror ?? undefined,
    processedOn: rec.msfthitl_processedon ?? undefined,
    reviewedOn: rec.msfthitl_reviewedon ?? undefined,
    createdOn: rec.createdon ?? undefined,
  };
}

function documentChangesToRecord(changes: Partial<DocumentRecord>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Use key presence (not value !== undefined) so callers can explicitly CLEAR a
  // field by passing `undefined` (e.g. re-queue clears Processing Error). Cleared
  // values map to null for the Dataverse Web API.
  const has = (k: keyof DocumentRecord) => Object.prototype.hasOwnProperty.call(changes, k);
  if (has('documentName')) out.msfthitl_documentname = changes.documentName ?? null;
  if (has('processingStatus')) out.msfthitl_processingstatus = changes.processingStatus;
  if (has('reviewStatus')) out.msfthitl_reviewstatus = changes.reviewStatus;
  if (has('reviewComment')) out.msfthitl_reviewcomment = changes.reviewComment ?? null;
  if (has('processingError')) out.msfthitl_processingerror = changes.processingError ?? null;
  if (has('randomDrawValue')) out.msfthitl_randomdrawvalue = changes.randomDrawValue ?? null;
  if (has('flaggedForReview')) out.msfthitl_flaggedforreview = changes.flaggedForReview ?? false;
  if (has('processedOn')) out.msfthitl_processedon = changes.processedOn ?? null;
  if (has('reviewedOn')) out.msfthitl_reviewedon = changes.reviewedOn ?? null;
  if (has('extractedData')) {
    out.msfthitl_extracteddata = changes.extractedData ? JSON.stringify(changes.extractedData) : null;
  }
  // The app only ever SETS the document type (the Agent assigns it); it never clears it.
  if (changes.documentTypeId) {
    out['msfthitl_documenttypeid@odata.bind'] = `/${DOCUMENT_TYPES_SET}(${changes.documentTypeId})`;
  }
  return out;
}

function createDocumentRepository(): DocumentRepository {
  return {
    async list() {
      const result = await Msfthitl_documentsService.getAll({ orderBy: ['createdon desc'] });
      const records = unwrap(result, 'documents.list()') ?? [];
      return records.map(toDocument);
    },
    async getById(id) {
      const result = await Msfthitl_documentsService.get(id);
      if (result.error) return null;
      return result.data ? toDocument(result.data) : null;
    },
    async create(input: CreateDocumentInput) {
      const payload = {
        msfthitl_documentname: input.documentName,
        msfthitl_processingstatus: input.processingStatus,
        msfthitl_reviewstatus: input.reviewStatus,
        msfthitl_randomdrawvalue: input.randomDrawValue,
        msfthitl_flaggedforreview: input.flaggedForReview,
      } as unknown as Omit<Msfthitl_documentsBase, 'msfthitl_documentid'>;

      const created = unwrap(await Msfthitl_documentsService.create(payload), 'documents.create()');
      const id = created.msfthitl_documentid;

      if (input.sourceFile) {
        const upload = await Msfthitl_documentsService.upload(id, SOURCE_FILE_COLUMN, input.sourceFile);
        if (upload.error) {
          throw new Error(`documents.create() file upload failed: ${String(upload.error)}`);
        }
        const refreshed = await Msfthitl_documentsService.get(id);
        if (!refreshed.error && refreshed.data) return toDocument(refreshed.data);
      }
      return toDocument(created);
    },
    async update(id, changes) {
      const body = documentChangesToRecord(changes) as Partial<
        Omit<Msfthitl_documentsBase, 'msfthitl_documentid'>
      >;
      const updated = unwrap(await Msfthitl_documentsService.update(id, body), 'documents.update()');
      return toDocument(updated);
    },
    async delete(id) {
      // The generated delete throws on failure (returns void on success).
      await Msfthitl_documentsService.delete(id);
    },
  };
}

// ── Document Type ───────────────────────────────────────────────────────────────

function toDocumentType(rec: Msfthitl_documenttypes): DocumentType {
  return {
    id: rec.msfthitl_documenttypeid,
    typeName: rec.msfthitl_documenttypename,
    description: rec.msfthitl_description ?? undefined,
    isActive: rec.msfthitl_isactive ?? true,
  };
}

function createDocumentTypeRepository(): DocumentTypeRepository {
  return {
    async list() {
      const result = await Msfthitl_documenttypesService.getAll({
        orderBy: ['msfthitl_documenttypename asc'],
      });
      const records = unwrap(result, 'documentTypes.list()') ?? [];
      return records.map(toDocumentType);
    },
    async create(input) {
      const payload = {
        msfthitl_documenttypename: input.typeName,
        msfthitl_description: input.description,
        msfthitl_isactive: input.isActive,
      } as unknown as Parameters<typeof Msfthitl_documenttypesService.create>[0];
      const created = unwrap(await Msfthitl_documenttypesService.create(payload), 'documentTypes.create()');
      return toDocumentType(created);
    },
    async update(id, changes) {
      const body: Record<string, unknown> = {};
      if (changes.typeName !== undefined) body.msfthitl_documenttypename = changes.typeName;
      if (changes.description !== undefined) body.msfthitl_description = changes.description;
      if (changes.isActive !== undefined) body.msfthitl_isactive = changes.isActive;
      const updated = unwrap(
        await Msfthitl_documenttypesService.update(
          id,
          body as Parameters<typeof Msfthitl_documenttypesService.update>[1],
        ),
        'documentTypes.update()',
      );
      return toDocumentType(updated);
    },
  };
}

// ── Review Settings (single row) ─────────────────────────────────────────────────

function toReviewSettings(rec: Msfthitl_reviewsettings): ReviewSettings {
  return {
    id: rec.msfthitl_reviewsettingid,
    name: rec.msfthitl_reviewsettingsname,
    rangeMin: rec.msfthitl_rangemin,
    rangeMax: rec.msfthitl_rangemax,
    triggerValue: rec.msfthitl_triggervalue,
  };
}

async function getOrCreateReviewSettingsRow(): Promise<Msfthitl_reviewsettings> {
  const result = await Msfthitl_reviewsettingsService.getAll({ top: 1, orderBy: ['createdon asc'] });
  const rows = unwrap(result, 'reviewSettings.get()') ?? [];
  if (rows.length > 0) return rows[0];
  const payload = {
    msfthitl_reviewsettingsname: 'Default',
    msfthitl_rangemin: 1,
    msfthitl_rangemax: 20,
    msfthitl_triggervalue: 7,
  } as unknown as Parameters<typeof Msfthitl_reviewsettingsService.create>[0];
  return unwrap(await Msfthitl_reviewsettingsService.create(payload), 'reviewSettings.get() (create Default)');
}

function createReviewSettingsRepository(): ReviewSettingsRepository {
  return {
    async get() {
      return toReviewSettings(await getOrCreateReviewSettingsRow());
    },
    async update(changes) {
      const row = await getOrCreateReviewSettingsRow();
      const body: Record<string, unknown> = {};
      if (changes.name !== undefined) body.msfthitl_reviewsettingsname = changes.name;
      if (changes.rangeMin !== undefined) body.msfthitl_rangemin = changes.rangeMin;
      if (changes.rangeMax !== undefined) body.msfthitl_rangemax = changes.rangeMax;
      if (changes.triggerValue !== undefined) body.msfthitl_triggervalue = changes.triggerValue;
      const updated = unwrap(
        await Msfthitl_reviewsettingsService.update(
          row.msfthitl_reviewsettingid,
          body as Parameters<typeof Msfthitl_reviewsettingsService.update>[1],
        ),
        'reviewSettings.update()',
      );
      return toReviewSettings(updated);
    },
  };
}

// ── Skill Update Request ──────────────────────────────────────────────────────────

function toSkillUpdateRequest(rec: Msfthitl_skillupdaterequests): SkillUpdateRequest {
  return {
    id: rec.msfthitl_skillupdaterequestid,
    // Friendly autonumber; not on the generated type until the column is provisioned,
    // so read it defensively from the record JSON. msfthitl_skillupdatenumber.
    skillUpdateNumber:
      (rec as { msfthitl_skillupdatenumber?: string }).msfthitl_skillupdatenumber ?? undefined,
    name: rec.msfthitl_skillupdaterequestname,
    documentId: rec._msfthitl_documentid_value ?? '',
    documentName: rec.msfthitl_documentidname ?? undefined,
    documentTypeName: rec.msfthitl_documenttypename ?? undefined,
    suggestedFix: rec.msfthitl_suggestedfix,
    status: Number(rec.msfthitl_skillupdatestatus) as SkillUpdateStatus,
    requestedOn: rec.msfthitl_requestedon ?? undefined,
    resolvedOn: rec.msfthitl_resolvedon ?? undefined,
  };
}

function createSkillUpdateRequestRepository(): SkillUpdateRequestRepository {
  return {
    async list() {
      const result = await Msfthitl_skillupdaterequestsService.getAll({ orderBy: ['createdon desc'] });
      const records = unwrap(result, 'skillUpdateRequests.list()') ?? [];
      return records.map(toSkillUpdateRequest);
    },
    async getById(id) {
      const result = await Msfthitl_skillupdaterequestsService.get(id);
      if (result.error) return null;
      return result.data ? toSkillUpdateRequest(result.data) : null;
    },
    async create(input: CreateSkillUpdateRequestInput) {
      const payload = {
        msfthitl_skillupdaterequestname: `Skill update for ${input.documentName ?? input.documentId}`,
        'msfthitl_documentid@odata.bind': `/${DOCUMENTS_SET}(${input.documentId})`,
        msfthitl_documenttypename: input.documentTypeName,
        msfthitl_suggestedfix: input.suggestedFix,
        msfthitl_skillupdatestatus: SkillUpdateStatus.New,
        msfthitl_requestedon: new Date().toISOString(),
      } as unknown as Parameters<typeof Msfthitl_skillupdaterequestsService.create>[0];
      const created = unwrap(
        await Msfthitl_skillupdaterequestsService.create(payload),
        'skillUpdateRequests.create()',
      );
      return toSkillUpdateRequest(created);
    },
    async update(id, changes) {
      const body: Record<string, unknown> = {};
      if (changes.name !== undefined) body.msfthitl_skillupdaterequestname = changes.name;
      if (changes.suggestedFix !== undefined) body.msfthitl_suggestedfix = changes.suggestedFix;
      if (changes.documentTypeName !== undefined) body.msfthitl_documenttypename = changes.documentTypeName;
      if (changes.status !== undefined) body.msfthitl_skillupdatestatus = changes.status;
      if (changes.resolvedOn !== undefined) body.msfthitl_resolvedon = changes.resolvedOn;
      const updated = unwrap(
        await Msfthitl_skillupdaterequestsService.update(
          id,
          body as Parameters<typeof Msfthitl_skillupdaterequestsService.update>[1],
        ),
        'skillUpdateRequests.update()',
      );
      return toSkillUpdateRequest(updated);
    },
  };
}

// ── Source File ────────────────────────────────────────────────────────────────

function createSourceFileService(): SourceFileService {
  return {
    async getSourceFileUrl(documentId): Promise<SourceFileRef | null> {
      const docResult = await Msfthitl_documentsService.get(documentId);
      if (docResult.error || !docResult.data) return null;
      const fileName = docResult.data.msfthitl_sourcefile_name ?? docResult.data.msfthitl_sourcefile;
      if (!fileName) return null;

      const download = await client.downloadFileFromRecord(DOCUMENTS, documentId, SOURCE_FILE_COLUMN);
      if (download.error || !download.data) return null;

      const mimeType = mimeFromName(fileName);
      const blob = new Blob([download.data], { type: mimeType });
      // Serve as a data: URL — the deployed Power Apps host CSP (img-src 'self' data:)
      // blocks blob: URLs, so object URLs never render there.
      return {
        url: await blobToDataUrl(blob),
        mimeType,
        fileName,
      };
    },
  };
}

export function createRealDataProvider(): AppDataProvider {
  return {
    documents: createDocumentRepository(),
    documentTypes: createDocumentTypeRepository(),
    reviewSettings: createReviewSettingsRepository(),
    skillUpdateRequests: createSkillUpdateRequestRepository(),
    sourceFiles: createSourceFileService(),
    fieldMetadata: { getField: getFieldMetadata },
  } satisfies AppDataProvider;
}
