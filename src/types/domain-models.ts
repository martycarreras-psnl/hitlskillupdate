// Domain models for the Document Intake & Human-in-the-Loop Review Code App.
// These are the UI-facing types. The provider contract (src/services/data-contracts.ts)
// is the seam between mock UX and real Dataverse connectors — connector records are
// adapted into these shapes so screens never depend on connector field names.
//
// Option-set integer values mirror dataverse/planning-payload.json (publisher
// choice-value base 720670000). Keep them in sync with the payload.

/** Processing lifecycle that drives the external Power Automate / Agent handoff. */
export enum ProcessingStatus {
  Uploaded = 720670000,
  Queued = 720670001,
  Processing = 720670002,
  Processed = 720670003,
  Failed = 720670004,
}

/** Human-in-the-loop review loop state. */
export enum ReviewStatus {
  NotRequired = 720670000,
  PendingReview = 720670001,
  InReview = 720670002,
  Approved = 720670003,
  Rejected = 720670004,
}

/** Processing lifecycle of a Skill Update Request. */
export enum SkillUpdateStatus {
  New = 720670000,
  InProgress = 720670001,
  Completed = 720670002,
  Dismissed = 720670003,
  /**
   * The reviewer approved the agent's recommendation and wants it implemented. An
   * agent picks this state up as the trigger to apply the recommendation to the skill,
   * then advances the request to Completed.
   */
  Approved = 720670004,
}

/**
 * Variable, schema-less information extracted from a document. The shape differs by
 * document type, so it is stored as JSON and rendered through the Dynamic Field Editor —
 * never as raw JSON. (ADR 0003 / 0004.)
 */
export type ExtractedData = Record<string, unknown>;

/** Admin-managed catalog of document categories (Receipt, Invoice, …). */
export interface DocumentType {
  id: string;
  typeName: string;
  description?: string;
  isActive: boolean;
}

/** Single configuration record for the random review draw. */
export interface ReviewSettings {
  id: string;
  name: string;
  rangeMin: number;
  rangeMax: number;
  triggerValue: number;
}

/** An uploaded document and everything the system knows about it. */
export interface DocumentRecord {
  id: string;
  /**
   * Friendly, system-generated unique identifier (e.g. DOC-2026-00001). Assigned by
   * Dataverse (autonumber column msfthitl_documentnumber) on create; immutable. Used
   * to reference the record from downstream agents/flows. Absent until the row is saved.
   */
  documentNumber?: string;
  documentName: string;
  sourceFileName?: string;
  sourceFileMimeType?: string;
  documentTypeId?: string;
  /** Denormalized display name of the linked Document Type, for list/detail rendering. */
  documentTypeName?: string;
  processingStatus: ProcessingStatus;
  extractedData?: ExtractedData;
  randomDrawValue?: number;
  flaggedForReview: boolean;
  reviewStatus: ReviewStatus;
  reviewComment?: string;
  processingError?: string;
  processedOn?: string;
  reviewedOn?: string;
  createdOn?: string;
}

/**
 * A reviewer's suggested improvement to the underlying agent skill, raised when a
 * Document is rejected. The app records and tracks it; implementing the fix in the
 * agent skill is out of scope. (ADR 0005.)
 */
export interface SkillUpdateRequest {
  id: string;
  /** Friendly autonumber assigned by Dataverse on create (e.g. SUR-2026-00001). */
  skillUpdateNumber?: string;
  name: string;
  documentId: string;
  documentName?: string;
  documentTypeName?: string;
  suggestedFix: string;
  /**
   * The agent's verbose recommendation for how to update the skill, derived from the
   * reviewer's suggested fix in the context of the skill's current content. Populated
   * by the agent; viewable and editable on the record. (Dataverse memo column
   * msfthitl_agentrecommendation.)
   */
  agentRecommendation?: string;
  status: SkillUpdateStatus;
  requestedOn?: string;
  resolvedOn?: string;
}
