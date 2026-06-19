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

This skill drives the **Dataverse MCP server (preview)** —
`https://carremacodeapps.crm.dynamics.com/api/mcp` — against the *HITL Skill Update* solution to
read a document image, convert it to JSON, and persist the result with correct status
transitions.

> **Scope guard.** Every call is restricted to the tables `msfthitl_documents` (read/write) and
> `msfthitl_documenttypes` (read only). Do not call any other table. If the MCP server exposes
> entities outside this list, ignore them.

## MCP tools this skill uses

The Dataverse MCP server (preview) exposes a fixed tool surface. This skill uses only:

| MCP tool | Use here |
|---|---|
| `read_query` | Run a Dataverse **SQL `SELECT`** to resolve the document and read its fields. |
| `search` | Discover applicable **business skills** (and table metadata) by keyword. |
| `describe` | Read a business skill's instructions, or inspect a record / table schema. |
| `update_record` | Set Processing, then write Extracted Data + terminal status. |
| `file_download` | Get a SAS download URL for the `msfthitl_sourcefile` File column. |

Do **not** use `create_record`, `delete_record`, `create_table`, `update_table`,
`delete_table`, `search_data`, `upsert_skill`, or `delete_skill`. Business skills are
**read-only context** here: discover with `search`, read with `describe`, follow their
guidance — but never author or delete them.

> **Tool-name note (preview surface changed).** The current server replaced `list_tables` /
> `describe_table` / `fetch` with `describe`, and the old data `search` is now `search_data`.
> Use the names in the table above.

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
2. Resolve it to the record GUID with **`read_query`** (Dataverse SQL `SELECT`):
   - Given a friendly number (`DOC-...`):
     ```sql
     SELECT msfthitl_documentid, msfthitl_documentnumber, msfthitl_processingstatus
     FROM   msfthitl_documents
     WHERE  msfthitl_documentnumber = 'DOC-2026-00001'
     ```
   - Given a GUID, confirm it exists the same way (`WHERE msfthitl_documentid = '<guid>'`).
3. If no row is returned, report it and stop. Do not create a record.

### Step 0.5 — Consult applicable business skills

Before extracting, use **`search`** to discover any **business skills** relevant to document
intake / extraction / classification / review (keywords: *document, extraction, invoice,
receipt, classification, intake, review*), then **`describe`** the best match(es) to read their
natural-language instructions. Follow that organizational guidance during extraction and
classification (e.g. required fields, expected JSON key names, when to assign a document type).
If none match, continue with the default behavior below. Read-only — never `upsert_skill` /
`delete_skill`. Hard guardrails in this skill (scope, status discipline, no fabricated data)
always take precedence over a business skill.

### Step 1 — Set status to Processing (before extraction)

Use **`update_record`** on `msfthitl_documents`, keyed by the GUID, to set Processing so
downstream watchers see work has begun:

- entity: `msfthitl_documents`
- key: `msfthitl_documentid = <documentId>`
- fields: `{ "msfthitl_processingstatus": 720670002 }`

If this update fails, report the error and stop.

### Step 2 — Read the image with `file_download`

Call **`file_download`** for this record's `msfthitl_sourcefile` File column. The Dataverse MCP
server returns a short-lived **SAS URL** to Azure Blob Storage
(`https://<account>.blob.core.windows.net/...?<token>`). This is the supported, by-design way
the MCP server hands back File-column content — there is **no** `$value` byte-stream tool in the
MCP surface. Fetch the bytes from that SAS URL, then extract.

If the file is absent, or fetching the SAS URL fails with **HTTP 403**, go to **Step 4
(failure)** with an `INFRASTRUCTURE:` reason — see *Troubleshooting* below. The 403 is an
environment egress/DLP block, not something a different tool call can route around.

### Step 3 — Extract to JSON

Analyze the document content and build one well-formed JSON object of the fields you can
confidently read (variable schema — extract what the document contains). Use `camelCase` keys.
Optionally match it to an active row in `msfthitl_documenttypes` via `read_query`:

```sql
SELECT msfthitl_documenttypeid, msfthitl_documenttypename
FROM   msfthitl_documenttypes
WHERE  msfthitl_isactive = 1
```

Remember the matched type's GUID for the write-back.

### Step 4 — Write back with `update_record`

**On success** — single `update_record` on `msfthitl_documents` (key `msfthitl_documentid`):

```json
{
  "msfthitl_extracteddata": "<the JSON object, serialized as a string>",
  "msfthitl_processingstatus": 720670003,
  "msfthitl_processedon": "<current UTC time, ISO 8601>",
  "msfthitl_processingerror": null,
  "msfthitl_documenttypeid": "<documentTypeId GUID, only if classified>"
}
```

Omit `msfthitl_documenttypeid` when you did not classify the document.

**On failure** — single `update_record`:

```json
{
  "msfthitl_processingstatus": 720670004,
  "msfthitl_processingerror": "<short human-readable reason>"
}
```

When the cause is infrastructure rather than the document (e.g. blocked SAS file download),
prefix the reason with `INFRASTRUCTURE:` so a human knows the record is safe to re-queue
unchanged, e.g.
`INFRASTRUCTURE: source file SAS download blocked (HTTP 403 egress). Retry when blob egress is allowed.`

Never leave the record in Processing. Never write partial JSON on failure.

---

## Troubleshooting — "source file SAS download 403"

Reading `msfthitl_sourcefile` via `file_download` returns a SAS URL to
`*.blob.core.windows.net`. **That SAS URL is the intended, only MCP-native file path** — do not
look for a `$value` endpoint; the MCP server doesn't expose one. If fetching that SAS URL
returns **HTTP 403**, the link is valid but the request is being blocked before it reaches blob
storage. This is an environment/network limitation, **not** a document defect, and cannot be
worked around with a different MCP tool. The fixes live **outside this skill**:

1. **Allow egress to Azure Blob Storage** (`*.blob.core.windows.net`) from wherever the agent
   runs, in the environment's network / DLP / firewall policy. This is the direct fix for the
   observed `invoice-09-techbridge.jpg` 403.
2. **Or read the file server-side inside Power Platform** — a Power Automate flow (or AI
   Builder / Document Intelligence action) reads `msfthitl_sourcefile` and passes the content
   to the agent, so no external blob fetch is needed.
3. **Check file size / 60s SAS timeout** for very large files.

Until one is in place, mark the record **Failed** with an `INFRASTRUCTURE:` reason, surface the
blocker to the user, and do **not** loop-retry the same URL or fabricate JSON. The record can
be re-queued unchanged once egress is allowed.

### Step 4.5 — Apply review rules (mandatory after a successful Processed)

Immediately after the document reaches **Processed**, **continue in the same run** and execute
the **`review-flagging`** business skill against the same record. This is a mandatory
continuation of intake, **not** an optional add-on — do not stop, do not ask the user. Discover
it with `search` (e.g. *review, flag, intake rules*) / read it with `describe` if it is
published as a Dataverse business skill, otherwise apply the bundled `review-flagging` skill.
It evaluates the type + extracted data and flags the record when a business rule matches.

- Run this only after a **successful** Processed. **Skip it for Failed** documents (no extracted
  data to evaluate).
- Every Invoice and Receipt that reaches Processed **must** have review rules evaluated before
  you report.
- The run is **not complete** until review rules have been evaluated and applied.

### Step 5 — Report

Return a one-line summary: Document Number, final processing status, **and the review-flagging
outcome** (flagged + reason, or not flagged). On a Failed run, give the failure reason instead.

---

## Invariants

- Only the record matching the supplied ID is touched — never bulk operations.
- Only `msfthitl_documents` (r/w) and `msfthitl_documenttypes` (read) are accessed.
- Exactly one terminal status per run: Processed **or** Failed, always preceded by Processing.
- `msfthitl_extracteddata` always holds a single parseable JSON object (no code fences, no prose).
- **Every Invoice and Receipt that reaches Processed must have review rules evaluated before the
  run ends** — a successful run that skipped `review-flagging` is incomplete.
- Re-processing a Failed record repeats the whole flow and clears the prior error on success.
