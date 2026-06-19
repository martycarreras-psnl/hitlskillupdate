// Mock seed data for the Phase 2 prototype. Two genuinely different Extracted Data
// shapes (Receipt and Invoice) exercise the Dynamic Field Editor's inference across
// strings, numbers, dates, arrays-of-objects, primitive arrays, and nested objects.

import type {
  DocumentRecord,
  DocumentType,
  ReviewSettings,
  SkillUpdateRequest,
} from '@/types/domain-models';
import { ProcessingStatus, ReviewStatus, SkillUpdateStatus } from '@/types/domain-models';

export const seedDocumentTypes: DocumentType[] = [
  { id: 'type-receipt', typeName: 'Receipt', description: 'Expense receipt', isActive: true },
  { id: 'type-invoice', typeName: 'Invoice', description: 'Supplier invoice', isActive: true },
];

export const seedReviewSettings: ReviewSettings = {
  id: 'settings-default',
  name: 'Default',
  rangeMin: 1,
  rangeMax: 20,
  triggerValue: 7,
};

const receiptExtract = {
  merchant: 'Blue Bottle Coffee',
  date: '2026-03-04',
  paymentMethod: 'Visa •••• 4242',
  subtotal: 18.5,
  tax: 1.62,
  total: 20.12,
  reimbursable: true,
  tags: ['coffee', 'client-meeting'],
  items: [
    { description: 'Cappuccino', qty: 2, price: 5.5 },
    { description: 'Almond Croissant', qty: 1, price: 4.0 },
    { description: 'Cold Brew', qty: 1, price: 3.5 },
  ],
};

const invoiceExtract = {
  vendor: 'Northwind Traders',
  invoiceNumber: 'NW-2026-00841',
  issueDate: '2026-02-18',
  dueDate: '2026-03-20',
  currency: 'USD',
  total: 4250.0,
  paid: false,
  poNumbers: ['PO-5521', 'PO-5522'],
  billTo: {
    company: 'Contoso Ltd.',
    attention: 'Accounts Payable',
    address: '123 Market St, Seattle, WA',
  },
  lineItems: [
    { sku: 'WDG-001', description: 'Industrial Widget', qty: 100, unitPrice: 32.5 },
    { sku: 'GAD-114', description: 'Precision Gadget', qty: 25, unitPrice: 40.0 },
  ],
};

export const seedDocuments: DocumentRecord[] = [
  {
    id: 'doc-1001',
    documentNumber: 'DOC-2026-00001',
    documentName: 'bluebottle-receipt-0304.jpg',
    sourceFileName: 'bluebottle-receipt-0304.jpg',
    sourceFileMimeType: 'image/svg+xml',
    documentTypeId: 'type-receipt',
    documentTypeName: 'Receipt',
    processingStatus: ProcessingStatus.Processed,
    extractedData: receiptExtract,
    randomDrawValue: 7,
    flaggedForReview: true,
    reviewStatus: ReviewStatus.PendingReview,
    processedOn: '2026-03-04T15:32:00Z',
    createdOn: '2026-03-04T15:30:00Z',
  },
  {
    id: 'doc-1002',
    documentNumber: 'DOC-2026-00002',
    documentName: 'northwind-invoice-00841.pdf',
    sourceFileName: 'northwind-invoice-00841.pdf',
    sourceFileMimeType: 'application/pdf',
    documentTypeId: 'type-invoice',
    documentTypeName: 'Invoice',
    processingStatus: ProcessingStatus.Processed,
    extractedData: invoiceExtract,
    randomDrawValue: 12,
    flaggedForReview: false,
    reviewStatus: ReviewStatus.NotRequired,
    processedOn: '2026-02-18T09:10:00Z',
    createdOn: '2026-02-18T09:05:00Z',
  },
  {
    id: 'doc-1003',
    documentNumber: 'DOC-2026-00003',
    documentName: 'office-supplies-receipt.jpg',
    sourceFileName: 'office-supplies-receipt.jpg',
    sourceFileMimeType: 'image/svg+xml',
    documentTypeId: 'type-receipt',
    documentTypeName: 'Receipt',
    processingStatus: ProcessingStatus.Processed,
    extractedData: {
      merchant: 'Staples',
      date: '2026-03-01',
      total: 64.18,
      reimbursable: true,
      items: [
        { description: 'Printer Paper (5 reams)', qty: 1, price: 42.0 },
        { description: 'Ballpoint Pens (12 pk)', qty: 2, price: 11.09 },
      ],
    },
    randomDrawValue: 7,
    flaggedForReview: true,
    reviewStatus: ReviewStatus.Approved,
    reviewComment: 'Totals match the receipt image. Approved.',
    processedOn: '2026-03-01T12:00:00Z',
    reviewedOn: '2026-03-02T08:15:00Z',
    createdOn: '2026-03-01T11:55:00Z',
  },
  {
    id: 'doc-1004',
    documentNumber: 'DOC-2026-00004',
    documentName: 'pending-upload.pdf',
    sourceFileName: 'pending-upload.pdf',
    sourceFileMimeType: 'application/pdf',
    processingStatus: ProcessingStatus.Queued,
    randomDrawValue: 3,
    flaggedForReview: false,
    reviewStatus: ReviewStatus.NotRequired,
    createdOn: '2026-03-10T14:20:00Z',
  },
  {
    id: 'doc-1005',
    documentNumber: 'DOC-2026-00005',
    documentName: 'blurry-scan.jpg',
    sourceFileName: 'blurry-scan.jpg',
    sourceFileMimeType: 'image/svg+xml',
    processingStatus: ProcessingStatus.Failed,
    processingError: 'Document could not be read: image resolution too low for extraction.',
    randomDrawValue: 15,
    flaggedForReview: false,
    reviewStatus: ReviewStatus.NotRequired,
    createdOn: '2026-03-09T10:00:00Z',
  },
  {
    id: 'doc-1006',
    documentNumber: 'DOC-2026-00006',
    documentName: 'taxi-receipt-flagged.jpg',
    sourceFileName: 'taxi-receipt-flagged.jpg',
    sourceFileMimeType: 'image/svg+xml',
    documentTypeId: 'type-receipt',
    documentTypeName: 'Receipt',
    processingStatus: ProcessingStatus.Queued,
    randomDrawValue: 7,
    flaggedForReview: true,
    reviewStatus: ReviewStatus.PendingReview,
    createdOn: '2026-03-11T18:45:00Z',
  },
];

export const seedSkillUpdateRequests: SkillUpdateRequest[] = [
  {
    id: 'sur-2001',
    skillUpdateNumber: 'SUR-2026-00001',
    name: 'Skill update for handwritten-receipt.jpg',
    documentId: 'doc-1003',
    documentName: 'office-supplies-receipt.jpg',
    documentTypeName: 'Receipt',
    suggestedFix:
      'The agent read the tax line as part of the subtotal. Teach the skill to detect a separate "Tax" line and exclude it from the item subtotal.',
    agentRecommendation:
      'Current behaviour: the extraction prompt sums every numeric line above "Total" into Subtotal, which folds the tax amount into the item subtotal.\n\nProposed change:\n1. Add a labelled-line classifier that recognises "Tax", "VAT", "GST", and "Sales Tax" (case-insensitive) and routes their amounts to a dedicated taxAmount field.\n2. Recompute Subtotal as the sum of item lines only, then assert Subtotal + taxAmount == Total within a 0.02 tolerance.\n3. When the assertion fails, flag the document for review instead of silently emitting a wrong subtotal.\n\nExpected impact: receipts with a separate tax line extract a correct item subtotal and a populated tax field.',
    status: SkillUpdateStatus.InProgress,
    requestedOn: '2026-03-02T09:00:00Z',
  },
  {
    id: 'sur-2002',
    skillUpdateNumber: 'SUR-2026-00002',
    name: 'Skill update for old-invoice-format.pdf',
    documentId: 'doc-1002',
    documentName: 'northwind-invoice-00841.pdf',
    documentTypeName: 'Invoice',
    suggestedFix:
      'Vendor name was captured with a trailing "Ltd." truncated. Improve the skill to capture the full legal vendor name.',
    status: SkillUpdateStatus.New,
    requestedOn: '2026-03-05T13:20:00Z',
  },
  {
    id: 'sur-2003',
    skillUpdateNumber: 'SUR-2026-00003',
    name: 'Skill update for fuel-receipt.jpg',
    documentId: 'doc-1003',
    documentName: 'office-supplies-receipt.jpg',
    documentTypeName: 'Receipt',
    suggestedFix:
      'Date was extracted in DD/MM order for a US receipt. Teach the skill to infer locale from the merchant address.',
    agentRecommendation:
      'Root cause: the date parser defaults to DD/MM/YYYY, so 03/04 on a US receipt is read as 4 March instead of 3 April.\n\nProposed change: before parsing any ambiguous date, resolve the merchant locale from the address block (country / state) and pass it to the parser so US addresses use MM/DD/YYYY. Where the address is missing, fall back to checking whether either ordering yields a day > 12 to disambiguate, and flag for review when still ambiguous.',
    status: SkillUpdateStatus.Completed,
    requestedOn: '2026-02-20T10:00:00Z',
    resolvedOn: '2026-02-27T16:30:00Z',
  },
];
