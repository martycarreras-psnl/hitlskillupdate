---
name: review-skill-editor
description: >-
  Reads reviewer suggestions from the Skill Update Requests table and views/updates the
  `review-flagging` business skill in Dataverse accordingly. Two modes: APPLY (process a named
  Skill Update Request and update the skill as suggested) and ADVISORY (read a request and
  recommend how best to update the skill, writing nothing). Use when the user asks to "process
  skill update request X", "update the review-flagging skill", "what does this request suggest",
  "how should I apply this suggestion", or to change the flagging rules / invoice threshold.
  Scoped to TWO artifacts only — the `review-flagging` business skill and the
  `msfthitl_skillupdaterequests` table (read + status) — via the Dataverse MCP server.
---

# Skill — Review-Flagging Skill Editor (Dataverse business skill)

This skill drives the **Dataverse MCP server (preview)** —
`https://carremacodeapps.crm.dynamics.com/api/mcp` — to **read reviewer suggestions from the
Skill Update Requests table** and **read/update the one `review-flagging` business skill** in
the *HITL Skill Update* solution. It is the governance counterpart to the runtime flagging:
this is where the flagging **policy** is maintained from reviewer feedback, not where documents
are processed.

Two modes:
- **Apply** — the user names a Skill Update Request; you read its suggested fix and update the
  skill as suggested (with confirmation).
- **Advisory** — the user asks what a request says or how best to implement it; you read it and
  recommend, **writing nothing** until they explicitly ask you to apply.

> **Scope guard.** Only two artifacts: the business skill **`review-flagging`** (read/write) and
> the table **`msfthitl_skillupdaterequests`** (read + status only). No other skill, table,
> record, or file. If `review-flagging` cannot be found, stop — do not edit or create anything
> else.

## What this edits

A **business skill** is solution-aware, natural-language guidance (process + policy + rules)
that runtime agents discover and follow. Editing `review-flagging` changes the live policy every
flagging agent applies — so changes are deliberate, confirmed, and verified.

## MCP tools this skill uses

| MCP tool | Use here |
|---|---|
| `read_query` | `SELECT` a Skill Update Request (by id or name) to read its suggested fix. |
| `search` | Find the `review-flagging` business skill (metadata search). |
| `describe` | Read the skill's full current content. |
| `update_record` | Advance a Skill Update Request's **status only**. |
| `upsert_skill` | Write the updated content back to `review-flagging`. |

Do **not** use any other tool — no `create_record`, `delete_record`, `create_table`,
`update_table`, `delete_table`, `file_download`, `search_data`, or `delete_skill`.

## Skill Update Requests table (`msfthitl_skillupdaterequests`)

| Field | Type | Use |
|---|---|---|
| `msfthitl_skillupdaterequestid` | GUID (PK) | Identify the request. |
| `msfthitl_skillupdaterequestname` | Text | Friendly name (alt key the user may give). |
| `msfthitl_suggestedfix` | Memo | **Read** — the reviewer's suggested change. |
| `msfthitl_documenttypename` | Text | Context (which type prompted it). |
| `msfthitl_skillupdatestatus` | Choice | **Write (status only)**. |
| `msfthitl_resolvedon` | DateTime | **Write** on Completed/Dismissed. |

Status values: New = `720670000`, In Progress = `720670001`, Completed = `720670002`,
Dismissed = `720670003`. On this table you may write **only** `msfthitl_skillupdatestatus` and
`msfthitl_resolvedon` — never the suggestion text, the document link, or any other column, and
never create/delete rows.

---

## Procedure

### Step 0 — Identify the request and the mode

The user usually names a **Skill Update Request** (by name or id) and wants either to **apply**
it (update the skill as suggested) or just **advice** (what it says / how best to apply). If the
suggested change is ambiguous, ask **one** focused question before touching anything. Never
invent policy numbers.

### Step 1 — Read the Skill Update Request

`read_query` the request from `msfthitl_skillupdaterequests`:

```sql
SELECT msfthitl_skillupdaterequestid, msfthitl_skillupdaterequestname,
       msfthitl_suggestedfix, msfthitl_documenttypename, msfthitl_skillupdatestatus
FROM   msfthitl_skillupdaterequests
WHERE  msfthitl_skillupdaterequestname = '<name the user gave>'
```

(Use `msfthitl_skillupdaterequestid = '<guid>'` if given an id.) Summarize the **suggested fix**
back in plain language. If no row matches, say so and stop.

### Step 2 — Load the current skill

1. `search` for the `review-flagging` business skill (keywords: *review, flag, flagging,
   threshold, intake rules*).
2. `describe` it to read the **full current content**. Always work against stored content.
3. If it does not exist, report and stop. Only create a new `review-flagging` skill if the user
   explicitly confirms.

### Step 3 — Advisory mode (no writes)

If the user only wants information/recommendation: compare the suggested fix to the current
skill and recommend the exact rule/wording to change, where, and any risks. **Call neither
`upsert_skill` nor `update_record`.** Offer to apply it.

### Step 4 — Apply mode: compose the edit

- Apply the **smallest** change that satisfies the suggestion; preserve untouched rules,
  structure, and formatting.
- Keep rules precise: name the **document type**, the **field**, the **comparison**, and the
  **value** (e.g. "Invoice `total` ≥ 5000").
- Present the proposed new content (or before/after diff) tied to the request's suggested fix.
- (Optional) `update_record` the request to **In Progress** (`720670001`) if tracking lifecycle.

### Step 5 — Confirm, then write the skill

- **Get explicit confirmation before `upsert_skill`.** State: "This updates the organization's
  review-flagging policy for all agents — proceed?"
- On approval, `upsert_skill` for `review-flagging` with the **full updated content** (upsert
  replaces the body — include everything, not just changed lines).

### Step 6 — Close out the request

Offer to set the request status via `update_record`: **Completed** (`720670002`) +
`msfthitl_resolvedon` = now if implemented, or **Dismissed** (`720670003`) + `msfthitl_resolvedon`
if the user decides not to act. Status fields only; user go-ahead only.

### Step 7 — Verify and report

- `describe` `review-flagging` again to confirm the change persisted.
- Report: exactly what changed (old → new, or rule added), the request's new status (if
  changed), and that the new policy is in effect for downstream agents.

---

## Examples

- **"Process skill update request SUR-014."** (apply) → `read_query` the request; summarize its
  suggested fix; `search`+`describe` `review-flagging`; compose the smallest edit; show the
  diff; confirm; `upsert_skill`; offer to mark the request **Completed**; re-`describe`; report.
- **"What does request SUR-014 suggest, and how should I apply it?"** (advisory) → `read_query`
  the request; `describe` the skill; recommend the precise change and call out risks; **write
  nothing**; offer to apply.
- **"Raise the invoice review threshold to $5,000."** (free-form apply) → `describe` the skill;
  change the invoice-total rule 2500 → 5000; confirm; `upsert_skill`; verify; report.

## Invariants

- Only two artifacts are ever touched: the `review-flagging` business skill and
  `msfthitl_skillupdaterequests` (read + status only).
- Only `read_query`, `search`, `describe`, `update_record`, `upsert_skill` are used — never
  `delete_skill`, `delete_record`, `file_download`, or any other table/record/file tool.
- On `msfthitl_skillupdaterequests`, only `msfthitl_skillupdatestatus` / `msfthitl_resolvedon`
  are written; rows are never created or deleted.
- Advisory mode writes nothing.
- Every skill write is preceded by a `describe` (read current) and explicit user confirmation.
- `upsert_skill` always sends the complete updated skill body, not a partial fragment.
- After every skill write, the skill is re-`describe`d to confirm persistence and the change is
  reported as old → new.
