---
name: review-flagging
description: >-
  Applies business rules to decide whether a processed document needs human review, and
  flags it in Dataverse when it does. Rules: flag any INVOICE whose total is at/above the
  configured threshold ($2,500), and flag any RECEIPT that appears to be from a restaurant.
  Runs AUTOMATICALLY as a mandatory continuation of intake immediately after any document is
  set to Processed by the document-extraction skill — it does NOT require an explicit user
  request. Also runs when the user asks to "flag", "review-check", "apply review rules", or
  "screen" a document. Operates ONLY on the in-scope tables of the HITLSkillUpdate solution
  via the Dataverse MCP server.
---

# Skill — Review Flagging (business rules)

This skill inspects an **already-processed** document and decides whether it should enter the
human-in-the-loop review loop, based on business policy. It is the mandatory post-extraction
continuation of the **document-extraction** skill: it needs the extracted JSON and the document
type that extraction produced, so it runs **immediately after** a document reaches **Processed**
— in the same run, without a separate user request.

> **Auto-invoked.** Whenever document-extraction sets a record to **Processed**, this skill runs
> automatically against that record before the intake run is considered complete. Treat an
> explicit user request ("flag this document") as a second, equivalent entry point — not the
> only way this skill runs.

> **Scope guard.** Same environment and tables as the extraction skill:
> `msfthitl_documents` (read/write) and `msfthitl_documenttypes` (read only) at
> `https://carremacodeapps.crm.dynamics.com/api/mcp`. Do not touch any other table.

> **Additive only.** This skill can **raise** a review flag; it must **never** clear one. If a
> document is already flagged (e.g. by the app's random draw) or already in/through review, this
> skill leaves the existing state intact — see *Guardrails*.

## Business rules

| # | Applies to | Condition | Action |
|---|---|---|---|
| R1 | **Invoice** | Total amount **≥ $2,500** (USD) | Flag for review |
| R2 | **Receipt** | The merchant **appears to be a restaurant** | Flag for review |
| — | Any other type / condition not met | — | Leave review fields unchanged |

`REVIEW_INVOICE_TOTAL_THRESHOLD = 2500` (USD). Treated as **at or above** the threshold. Adjust
this one constant to change the policy.

### R1 — Invoice total threshold

- Applies only when the document's type is **Invoice**.
- Read the total from `msfthitl_extracteddata`. The JSON shape is variable, so look across the
  common total keys (case-insensitive): `total`, `grandTotal`, `totalAmount`, `amountDue`,
  `invoiceTotal`, `balanceDue`. Use the document's final payable total, not a subtotal.
- Parse the numeric value (strip currency symbols, thousands separators). If the total is
  **≥ 2500**, the rule matches.
- If you cannot find or parse a total, **do not flag on R1** — instead note `total not found`
  in the flag reason only if some other rule flags it; otherwise leave unchanged and say so in
  the summary. Never fabricate a total.

### R2 — Receipt looks like a restaurant

- Applies only when the document's type is **Receipt**.
- Judge from the extracted data whether the merchant is a restaurant / food-service vendor.
  Strong signals (any combination):
  - **Merchant name** contains words like *restaurant, café/cafe, grill, bistro, diner,
    kitchen, eatery, pizzeria, taqueria, sushi, bar & grill, steakhouse, brewery, pub,
    coffee, bakery, BBQ*.
  - **Line items** are food/drink (entrées, appetizers, beverages, drinks, sides).
  - Presence of a **gratuity / tip** line, **table number**, **server/waiter name**, **guest
    count**, or **"dine in" / "to go"** markers.
- This is a judgment call — flag when the receipt **appears** to be a restaurant on the balance
  of these signals. A gas station, grocery store, hardware store, pharmacy, or rideshare
  receipt is **not** a restaurant.

---

## MCP tools this skill uses

| MCP tool | Use here |
|---|---|
| `read_query` | Read the document's type, status, and extracted data (SQL `SELECT`). |
| `update_record` | Set the review flag / status when a rule matches. |

Do **not** use any create/delete/table tools, `search_data`, or the skill tools.

## Fields involved

| Field (logical name) | Direction | Notes |
|---|---|---|
| `msfthitl_processingstatus` | read | Must be **Processed** (`720670003`) for rules to run. |
| `msfthitl_documenttypeid` | read | Lookup → `msfthitl_documenttypes`; gives Invoice / Receipt. |
| `msfthitl_extracteddata` | read | The JSON extraction produced (total, line items, merchant). |
| `msfthitl_flaggedforreview` | write | Set `true` when a rule matches. Never set `false`. |
| `msfthitl_reviewstatus` | write | Set **Pending Review** (`720670001`) when a rule matches — only if not already in/through review. |
| `msfthitl_reviewcomment` | write (optional) | A short `AUTO-FLAG:` note explaining which rule fired. |

### Review Status values (option set `msfthitl_reviewstatus`)

| Label | Value |
|---|---|
| Not Required | `720670000` |
| **Pending Review** | `720670001` |
| In Review | `720670002` |
| Approved | `720670003` |
| Rejected | `720670004` |

---

## Procedure

### Step 0 — Resolve the Document ID

Same as the extraction skill: take the ID from the prompt (GUID or friendly `DOC-…`). **If none
is present, ask and stop.** Resolve a friendly number to the GUID with `read_query`.

### Step 1 — Read what the rules need

One `read_query`, joining to the type so you get its name:

```sql
SELECT  d.msfthitl_documentid,
        d.msfthitl_documentnumber,
        d.msfthitl_processingstatus,
        d.msfthitl_extracteddata,
        d.msfthitl_flaggedforreview,
        d.msfthitl_reviewstatus,
        t.msfthitl_documenttypename
FROM    msfthitl_documents d
LEFT JOIN msfthitl_documenttypes t
       ON d.msfthitl_documenttypeid = t.msfthitl_documenttypeid
WHERE   d.msfthitl_documentid = '<documentId>'
```

**Preconditions** (if any fails, do nothing and explain in the summary):
- `msfthitl_processingstatus` must be **Processed** (`720670003`). If it is Uploaded / Queued /
  Processing / Failed, the document isn't ready — skip without writing.
- `msfthitl_extracteddata` must be present and parse as a JSON object.
- The type must be **Invoice** or **Receipt**; other types have no rule.

### Step 2 — Evaluate the rule for the type

- **Invoice** → apply **R1** (total ≥ 2500).
- **Receipt** → apply **R2** (restaurant heuristics).

Decide `shouldFlag` (true/false) and, if true, a one-line `reason`, e.g.
`Invoice total $3,480.00 ≥ $2,500 threshold` or
`Receipt merchant "Olive Branch Bistro" appears to be a restaurant (entrées + gratuity line)`.

### Step 3 — Flag if matched (additive, guarded)

If `shouldFlag` is **false**: write nothing. Report "no review rule matched".

If `shouldFlag` is **true**, build an `update_record` on `msfthitl_documents` (key
`msfthitl_documentid`):

```json
{
  "msfthitl_flaggedforreview": true,
  "msfthitl_reviewstatus": 720670001,
  "msfthitl_reviewcomment": "AUTO-FLAG: <reason>"
}
```

**Guardrails on the write:**
- Always set `msfthitl_flaggedforreview = true` (never `false`).
- Only set `msfthitl_reviewstatus = 720670001` (Pending Review) when the current status is
  **Not Required** (`720670000`) or null. If it is already **In Review / Approved / Rejected**,
  **omit** `msfthitl_reviewstatus` from the update — do not reopen or downgrade an active or
  completed review. (Setting it when it is already Pending Review is fine / idempotent.)
- `msfthitl_reviewcomment` is optional but recommended. If the field already holds a reviewer's
  note (no `AUTO-FLAG:` prefix), **do not overwrite it** — leave the comment out of the update.

### Step 4 — Report

One-line summary: Document Number, type, the decision (flagged / not flagged), and the reason.

---

## Invariants

- Only the record matching the supplied ID is touched — never bulk operations.
- Only `msfthitl_documents` (r/w) and `msfthitl_documenttypes` (read) are accessed.
- The skill only **raises** review flags; it never clears `msfthitl_flaggedforreview` and never
  resets an In Review / Approved / Rejected document back to Pending Review.
- Rules run only on **Processed** documents with parseable extracted data.
- Thresholds/heuristics are policy: `REVIEW_INVOICE_TOTAL_THRESHOLD = 2500`, restaurant signals
  as listed. No total is ever invented to satisfy a rule.
