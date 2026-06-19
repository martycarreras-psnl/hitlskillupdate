---
name: recommend-skill-update
description: >-
  Generates a concrete recommendation for how to update the `review-flagging` business skill
  from a reviewer's submitted Skill Update Request, judged in the context of what the skill
  already does, and SAVES that recommendation back onto the request record
  (msfthitl_agentrecommendation). Expects a Skill Update Number (SUR-YYYY-#####). Use when the
  user asks to "generate a recommendation for SUR-…", "recommend how to update the skill for
  this request", or "write and save a recommendation". Does NOT change the skill itself — it
  only records advice on the request. Scoped to the `review-flagging` business skill (read) and
  the `msfthitl_skillupdaterequests` table (read + recommendation/status) via the Dataverse MCP
  server.
---

# Skill — Recommend Skill Update (generate + save recommendation)

This skill turns a reviewer's **Skill Update Request** into a concrete, reasonable
recommendation for how the `review-flagging` business skill should change, then **saves that
recommendation onto the request record** so a reviewer/admin can review (and later apply) it.

It is part of the **review-skill-editor** agent. It is the "think and record" step that sits
*before* applying a change: it **reads** the request and the current skill, **writes the
recommendation** to the request, and **never** calls `upsert_skill`. Applying the change to the
skill is a separate, confirmed step (the editor's apply mode).

> **Scope guard.** Read the `review-flagging` business skill (for context) and the
> `msfthitl_skillupdaterequests` table; write only `msfthitl_agentrecommendation` (and,
> optionally, status) on the request. No other skill, table, record, or file. Never
> `upsert_skill` in this skill.

## Inputs

- **Skill Update Number** (`msfthitl_skillupdatenumber`, e.g. `SUR-2026-00007`) — **required**.
  If the user asks for a recommendation without one, **ask for the Skill Update Number and stop**
  until they provide it. (A request id or name is also acceptable if that's what they give.)

## MCP tools this skill uses

| MCP tool | Use here |
|---|---|
| `read_query` | Read the Skill Update Request (by Skill Update Number) — suggested fix + context. |
| `search` | Find the `review-flagging` business skill (metadata search). |
| `describe` | Read the skill's full current content (the context to judge against). |
| `update_record` | Save `msfthitl_agentrecommendation` (and optional status) on the request. |

Do **not** use `upsert_skill` here, and never `create_record`, `delete_record`, `delete_skill`,
`file_download`, `search_data`, or any table/schema tool.

## Request fields

| Field | Direction | Notes |
|---|---|---|
| `msfthitl_skillupdatenumber` | read | The `SUR-…` identifier the user supplies. |
| `msfthitl_suggestedfix` | read | The reviewer's submitted request — what to base the recommendation on. |
| `msfthitl_documenttypename` | read | Context (which type prompted it). |
| `msfthitl_agentrecommendation` | **write** | Where the generated recommendation is saved. |
| `msfthitl_skillupdatestatus` | write (optional) | Advance to In Progress (`720670001`). |

---

## Procedure

### Step 0 — Require a Skill Update Number

Take the **Skill Update Number** from the prompt. If none is present, **ask for it and stop** —
do not pick "the latest" request or guess.

### Step 1 — Read the request

`read_query` the request from `msfthitl_skillupdaterequests`:

```sql
SELECT msfthitl_skillupdaterequestid, msfthitl_skillupdatenumber,
       msfthitl_suggestedfix, msfthitl_agentrecommendation,
       msfthitl_documenttypename, msfthitl_skillupdatestatus
FROM   msfthitl_skillupdaterequests
WHERE  msfthitl_skillupdatenumber = 'SUR-2026-00007'
```

Summarize the **suggested fix** back to the user. If no row matches, say so and stop. Note
whether `msfthitl_agentrecommendation` is already populated (you may need to confirm overwrite).

### Step 2 — Read the current skill (context)

`search` for the `review-flagging` business skill, then `describe` it to read its **full current
content**. The recommendation must be judged against what the skill **already does** — which
rules exist, their thresholds, and their structure.

### Step 3 — Generate a reasonable recommendation

Compose a clear, implementable recommendation that satisfies the suggested fix **in the context
of the existing skill**:

- **Ground it in the current content** — reference the specific existing rule(s) it would change
  or add, and keep it consistent with the skill's structure and intent.
- **Be specific** — name the document type, the field, the comparison, and the value; show the
  proposed rule wording (e.g. *"Add to the Invoice rules: flag when `total` ≥ 5000, alongside
  the existing ≥ 2500 rule — or raise the existing threshold to 5000 if the intent is to
  replace it."*).
- **Call out risk/ambiguity** — side effects, overlaps, or unclear intent (e.g. "would also
  catch credit memos"). If the suggestion is unreasonable or out of scope for review-flagging,
  say so and recommend the closest sound alternative. Never invent policy the request didn't ask
  for.

This recommendation is **verbose by design** (the field allows large text) — it's meant to be
read and possibly edited by a human before any skill change.

### Step 4 — Save the recommendation to the record

If `msfthitl_agentrecommendation` is already populated, show the user and confirm before
overwriting. Then `update_record` on `msfthitl_skillupdaterequests` (key the request):

```json
{
  "msfthitl_agentrecommendation": "<the generated recommendation text>"
}
```

(Optional) also set `msfthitl_skillupdatestatus` to **In Progress** (`720670001`) if the user
wants the lifecycle tracked.

### Step 5 — Verify and report

`read_query` the request again to confirm `msfthitl_agentrecommendation` persisted. Report: the
Skill Update Number, that the recommendation was saved, a one-line gist of the recommendation,
and an offer to **apply** it to the `review-flagging` skill as a separate, confirmed step.

---

## Invariants

- A **Skill Update Number** (or explicit request id/name) is required; without it, ask and stop.
- The recommendation is grounded in the **current skill content** and the request's suggested
  fix — never generic, never invented policy.
- Writes only `msfthitl_agentrecommendation` (and optionally `msfthitl_skillupdatestatus`) on the
  request. The `review-flagging` skill is **read-only** here — never `upsert_skill`.
- Existing recommendations are not overwritten without confirmation.
- After saving, the write is verified with a re-read, and the user is offered the apply step.
