---
name: document-extraction
description: >-
  Extracts structured JSON from a document's stored image and writes it back to the
  Dataverse Document record, managing the Processing Status lifecycle (Processing →
  Processed / Failed). Use when the user asks to "process", "extract", "read", or
  "run extraction on" a document and supplies (or can supply) a Document ID. Operates
  ONLY on the in-scope tables of the HITLSkillUpdate solution via the Dataverse MCP tool.
---

# Skill — Document Extraction (Dataverse MCP)

This skill drives the **Dataverse MCP tool** against the *HITL Skill Update* solution to read a
document image, convert it to JSON, and persist the result with correct status transitions.

> **Scope guard.** Every Dataverse call in this skill targets the environment
> `https://carremacodeapps.crm.dynamics.com` and is restricted to the tables
> `msfthitl_documents` (read/write) and `msfthitl_documenttypes` (read only). Do not call any
> other table. If a Dataverse MCP tool offers entities outside this list, ignore them.

## Key facts

| Item | Value |
|---|---|
| Document table (entity set) | `msfthitl_documents` |
| Primary key | `msfthitl_documentid` (GUID) |
| Friendly id | `msfthitl_documentnumber` (e.g. `DOC-2026-00001`) |
| Image/source file column | `msfthitl_sourcefile` (File) |
| Extracted JSON column | `msfthitl_extracteddata` (Memo) |
| Status column | `msfthitl_processingstatus` (Choice) |
| Error column | `msfthitl_processingerror` (Memo) |
| Completed timestamp | `msfthitl_processedon` (DateTime) |
| Type lookup | `msfthitl_documenttypeid` → `msfthitl_documenttypes` |

Status values: Processing = `720670002`, Processed = `720670003`, Failed = `720670004`.

---

## Procedure

### Step 0 — Resolve the Document ID

1. Extract an identifier from the prompt. **If none is present, ask the user for a Document ID
   and stop.**
2. If the identifier is a **friendly number** (`DOC-...`), resolve it to the GUID:
   - Retrieve from `msfthitl_documents` filtering `msfthitl_documentnumber eq '<value>'`,
     selecting `msfthitl_documentid`.
   - OData example:
     `GET /api/data/v9.2/msfthitl_documents?$filter=msfthitl_documentnumber eq 'DOC-2026-00001'&$select=msfthitl_documentid`
3. If no record is found, report it and stop. Do not create a record.

### Step 1 — Set status to Processing (before extraction)

Update the record to Processing so downstream watchers see work has begun:

```http
PATCH /api/data/v9.2/msfthitl_documents(<documentId>)
Content-Type: application/json

{ "msfthitl_processingstatus": 720670002 }
```

If this PATCH fails, report the error and stop.

### Step 2 — Read the image

Confirm a file is present (`msfthitl_sourcefile` / `msfthitl_sourcefile_name` not null), then
download the binary from the File column:

```http
GET /api/data/v9.2/msfthitl_documents(<documentId>)/msfthitl_sourcefile/$value
```

If there is no file or it cannot be downloaded/read, go to **Step 4 (failure)**.

### Step 3 — Extract to JSON

Analyze the document content and build one well-formed JSON object of the fields you can
confidently read (variable schema — extract what the document contains). Use `camelCase` keys.
Optionally match it to an active row in `msfthitl_documenttypes`
(`GET /api/data/v9.2/msfthitl_documenttypes?$filter=msfthitl_isactive eq true&$select=msfthitl_documenttypeid,msfthitl_documenttypename`)
and remember the type's GUID for the write-back.

### Step 4 — Write back

**On success** (single PATCH):

```http
PATCH /api/data/v9.2/msfthitl_documents(<documentId>)
Content-Type: application/json

{
  "msfthitl_extracteddata": "<the JSON object, serialized as a string>",
  "msfthitl_processingstatus": 720670003,
  "msfthitl_processedon": "<current UTC time, ISO 8601>",
  "msfthitl_processingerror": null,
  "msfthitl_documenttypeid@odata.bind": "/msfthitl_documenttypes(<typeId>)"
}
```

Omit the `...@odata.bind` line when you did not classify the document.

**On failure** (single PATCH):

```http
PATCH /api/data/v9.2/msfthitl_documents(<documentId>)
Content-Type: application/json

{
  "msfthitl_processingstatus": 720670004,
  "msfthitl_processingerror": "<short human-readable reason>"
}
```

Never leave the record in Processing. Never write partial JSON on failure.

### Step 5 — Report

Return a one-line summary: Document Number, final status, and (on failure) the reason.

---

## Invariants

- Only the record matching the supplied ID is touched — never bulk operations.
- Only `msfthitl_documents` (r/w) and `msfthitl_documenttypes` (read) are accessed.
- Exactly one terminal status per run: Processed **or** Failed, always preceded by Processing.
- `msfthitl_extracteddata` always holds a single parseable JSON object (no code fences, no prose).
- Re-processing a Failed record repeats the whole flow and clears the prior error on success.
