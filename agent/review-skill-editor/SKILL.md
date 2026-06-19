---
name: review-skill-editor
description: >-
  Views and updates the `review-flagging` business skill stored in Dataverse — the
  natural-language policy that decides which documents are flagged for human review
  (e.g. invoice total thresholds, restaurant-receipt heuristics). Use when the user asks to
  "update the review-flagging skill", "change the flagging rules", "edit the review policy",
  "change the invoice threshold", or similar. Scoped to ONE artifact only — the
  `review-flagging` business skill — via the Dataverse MCP server. Never touches tables,
  records, files, or any other skill.
---

# Skill — Review-Flagging Skill Editor (Dataverse business skill)

This skill drives the **Dataverse MCP server (preview)** —
`https://carremacodeapps.crm.dynamics.com/api/mcp` — to **read and update the one
`review-flagging` business skill** in the *HITL Skill Update* solution. It is the governance
counterpart to the document-extraction / review-flagging runtime: this is where the flagging
**policy** is maintained, not where documents are processed.

> **Scope guard.** The only artifact in scope is the business skill named **`review-flagging`**.
> No Dataverse tables, records, or files. No other business skill. If `review-flagging` cannot
> be found, stop — do not edit or create anything else.

## What this edits

A **business skill** is solution-aware, natural-language guidance (process + policy + rules)
that runtime agents discover and follow. Editing `review-flagging` changes the live policy every
flagging agent applies — so changes are deliberate, confirmed, and verified.

## MCP tools this skill uses

| MCP tool | Use here |
|---|---|
| `search` | Find the `review-flagging` business skill (metadata search). |
| `describe` | Read the skill's full current content. |
| `upsert_skill` | Write the updated content back to `review-flagging`. |

Do **not** use any other tool — no `read_query`, `update_record`, `create_record`,
`delete_record`, `create_table`, `update_table`, `delete_table`, `file_download`, `search_data`,
or `delete_skill`.

---

## Procedure

### Step 0 — Clarify the requested change

Expect a request to update the review-flagging policy (threshold change, new rule, refined
heuristic, wording fix). If the target value/rule is ambiguous, ask **one** focused question to
pin it down before touching anything. Never invent policy numbers.

### Step 1 — Load the current skill

1. `search` for the `review-flagging` business skill (keywords: *review, flag, flagging,
   intake rules, threshold*).
2. `describe` it to read the **full current content**. Always edit against stored content.
3. If it does not exist, report that and stop. Only create a new `review-flagging` skill if the
   user explicitly confirms they want one created.

### Step 2 — Compose the edit

- Apply the **smallest** change that satisfies the request; preserve all untouched rules,
  structure, and formatting.
- Keep rules precise and unambiguous: name the **document type**, the **field**, the
  **comparison**, and the **value** (e.g. "Invoice `total` ≥ 5000"). Vague edits cause
  inconsistent flagging downstream.
- Present the proposed new content (or a clear before/after diff) and the rationale to the user.

### Step 3 — Confirm, then write

- **Get explicit confirmation before `upsert_skill`.** State: "This updates the organization's
  review-flagging policy for all agents that use it — proceed?"
- On approval, call `upsert_skill` for `review-flagging` with the **full updated content**
  (upsert replaces the skill body — include everything, not just the changed lines).

### Step 4 — Verify and report

- `describe` `review-flagging` again to confirm the change persisted.
- Report a one-line summary: exactly what changed (old → new, or rule added) and that the new
  policy is now in effect for downstream agents.

---

## Examples

- **"Raise the invoice review threshold to $5,000."** → `search` + `describe` `review-flagging`;
  change the invoice-total rule value from 2500 to 5000; show the diff; confirm; `upsert_skill`;
  re-`describe`; report "Invoice flag threshold $2,500 → $5,000."
- **"Also flag any receipt over $200."** → add a new receipt rule alongside the restaurant
  heuristic, leaving the restaurant rule intact; confirm; write; verify.
- **"Stop flagging restaurant receipts."** → remove (or disable) the restaurant rule only,
  leaving the invoice rule intact; confirm (this loosens policy); write; verify.

## Invariants

- Only the `review-flagging` business skill is ever read or written.
- Only `search`, `describe`, `upsert_skill` are used — never `delete_skill` or any table/record/
  file tool.
- Every write is preceded by a `describe` (read current) and explicit user confirmation.
- `upsert_skill` always sends the complete updated skill body, not a partial fragment.
- After every write, the skill is re-`describe`d to confirm persistence, and the change is
  reported as old → new.
