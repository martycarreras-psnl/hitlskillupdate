# Build Plan — Document Intake & Human-in-the-Loop Review

> **Purpose of this document.** This is the authoritative, resumable build plan for the
> Document Intake Code App. It was produced in a planning session and is handed off to an
> executing session. **Read this file at the start of every working session, update the
> checkboxes as you complete tasks, and keep working until every box is checked.** Do not
> re-litigate the locked decisions below unless the user explicitly asks.

> **▶ HANDOFF STATUS (2026-06-18): Phases 0–2 are COMPLETE, validated, and deployed on the
> mock provider. The next session executes Phase 3 (provision Dataverse) → Phase 4 (connect
> real data) → Phase 5 (verify handoff seams). Jump to [§7 Handoff to the Dataverse session](#7-handoff-to-the-dataverse-execution-session)
> for the exact starting steps, the hard gate, and the real-data-provider contract checklist.**

**Related artifacts (read these too):**
- [CONTEXT.md](../CONTEXT.md) — business glossary (the canonical vocabulary for this app)
- [dataverse/planning-payload.json](../dataverse/planning-payload.json) — source of truth for the Dataverse schema
- [docs/adr/0001-file-column-storage.md](adr/0001-file-column-storage.md) … `0004` — locked architectural decisions
- `AGENTS.md` / `.github/instructions/` — repo guardrails (Code App, HashRouter, three-layer, Fluent UI v9, etc.)

**Locked project identity (from `.wizard-state.json`):**
| Key | Value |
|---|---|
| Publisher prefix | `msfthitl` |
| Choice-value base | `720670000` (option-set integer values) |
| Solution unique name | `HITLSkillUpdate` |
| Solution display name | `HITL Skill Update` |
| Publisher | `HITL` ("HITL Skill Update") |
| Dev environment | `https://carremacodeapps.crm.dynamics.com` |
| App | `HITL Skill Improvement` (appId `393b3d88-1865-4a85-a7e1-f7eba7af52d2`) |

> Every Dataverse object uses the `msfthitl_` prefix. All `dv-metadata` / `dv-data` calls must pass `solution="HITLSkillUpdate"`, and every `pac code push` must carry `-s "HITLSkillUpdate"`.

---

## 1. What we are building

A Power Apps Code App where users upload documents (expense receipts, invoices, and future
types). For each document the app:

1. Stores the **original uploaded file** so it can be displayed back on the record.
2. Holds the document's **extracted information as variable JSON** (shape differs per type).
3. At record creation, **draws a random integer** within a configurable range and, if it equals
   the configurable **Trigger Value**, **flags the record for human-in-the-loop review**. The
   drawn number is **captured/stored** on the record.
4. Lets a **reviewer** view the file and **correct the extracted data through dynamically
   generated controls** (never raw JSON), then approve or reject.

**The app does NOT process or extract documents.** An external Power Automate flow watches the
`Processing Status` field; when it sees `Queued` it kicks off an Agent that classifies the
document, writes back the `Document Type` and the `Extracted Data` JSON, and advances the status.
Building that flow/Agent is **out of scope** for this app — the app only sets the trigger and
consumes the JSON the Agent writes back.

---

## 2. Locked decisions (do not re-open without explicit user request)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Source-file storage | Native Dataverse **File column** on the Document record, one file per record. ([ADR 0001](adr/0001-file-column-storage.md)) |
| 2 | Document type model | Configurable **Document Type lookup table**, admin-extensible without code change. |
| 3 | Who sets the type | The **Agent** sets it during processing (empty at upload). |
| 4 | Processing trigger | Single **Processing Status** choice: `Uploaded → Queued → Processing → Processed → Failed`. App sets `Queued`; external flow watches it. |
| 5 | Random draw timing/owner | Drawn **in the app, client-side, at record creation**. Drawn value is **stored**. ([ADR 0002](adr/0002-draw-in-app.md)) |
| 6 | Config storage | Single-row **Review Settings** table (`Range Min`, `Range Max`, `Trigger Value`), edited via an in-app **Admin Settings** screen at runtime. |
| 7 | Reviewer actions | View file, **edit extracted data via generated controls**, Approve/Reject with comment. `Pending Review → In Review → Approved → Rejected`. |
| 8 | Extracted-data editor | **Dynamic Field Editor** infers Fluent UI controls from JSON value shapes; writes edits back into JSON; **never shows raw JSON**. ([ADR 0004](adr/0004-infer-form-from-json.md)) |
| 9 | Extracted-data storage | Stored as **JSON text in a Dataverse Memo column** (up to 1 MB). ([ADR 0003](adr/0003-json-in-dataverse-text.md)) |
| 10 | Roles | **Uploader / Reviewer / Admin** as Dataverse security roles. |
| 11 | Ownership & visibility | All tables **User/Team owned, no org-owned**. Authorization & data scope delegated entirely to **Dataverse security modeling** — do not model visibility in app code. |
| 12 | Screens | **Dashboard / Documents / Document Detail / Review Queue / Admin Settings**. |

**Resolved follow-ups from the plan review:**
- Review Queue shows only Documents where `Flagged For Review = true AND Processing Status = Processed AND Review Status = Pending Review` (can't review before the Agent fills in the JSON). Flagged-but-not-yet-processed records show a "waiting for processing" state elsewhere, not in the actionable queue.
- `Document Name` defaults to the uploaded file name on upload.
- **Publisher prefix is locked: `msfthitl`** (set during the wizard). The payload already uses it — no find/replace needed.

---

## 3. Data model (see `dataverse/planning-payload.json` for the exact column specs)

**Document** (User-owned, Notes on)
- `Document Name` (primary, defaults to file name)
- `Source File` (**File column**, required)
- `Document Type` (lookup → Document Type, set by Agent)
- `Processing Status` (choice; app sets `Queued`)
- `Extracted Data` (Memo / JSON text, up to 1 MB)
- `Random Draw Value` (whole number, captured)
- `Flagged For Review` (yes/no)
- `Review Status` (choice)
- `Review Comment` (memo; required on reject)
- `Processing Error` (memo; set by flow on Failed)
- `Processed On`, `Reviewed On` (date/time)

**Document Type** (admin-managed lookup): `Type Name` (primary), `Description`, `Is Active`

**Review Settings** (single row): `Name`, `Range Min`, `Range Max`, `Trigger Value`

**Skill Update Request** (User-owned) — *added during prototype review (ADR 0005)*: `Name` (primary, defaults to `Skill update for <document>`), `Document` (lookup → Document), `Document Type` (text snapshot), `Suggested Fix` (memo, the reviewer's improvement note), `Skill Update Status` (choice), `Requested On`, `Resolved On`. Raised when a reviewer rejects a Document.

**Option sets:** `Processing Status`, `Review Status`, `Skill Update Status` (values defined in the payload).

---

## 4. Execution plan (work top to bottom; check boxes as you go)

The repo enforces **plan-first → prototype-second → connect-later**. Build and validate the whole
app on mock data before touching Dataverse.

### Phase 0 — Setup & prerequisites
- [x] Confirm the Code App is scaffolded (`src/`, `power.config.json`, `package.json` exist). If not, run `npx @pacaf/wizard-ux@latest` — do **not** hand-scaffold.
- [x] Confirm prerequisites pass (`node`, `pac`, `dotnet`, `git`) per `00-prereq-gate`. (`pac` authed to dev env `carremacodeapps`, User profile; app deploys via `pac code push -s "HITLSkillUpdate"`.)
- [x] **Publisher prefix locked: `msfthitl`** (set during the wizard; payload already uses it).

### Phase 1 — Planning artifacts (mostly done)
- [x] `CONTEXT.md` glossary created.
- [x] `dataverse/planning-payload.json` rewritten with the tables, option sets, lookups, seed data, security roles (now **4 tables, 3 option sets** after the prototype-review scope add).
- [x] ADRs 0001–0005 recorded.
- [x] Review the payload with the user once the prefix is locked.

### Phase 2 — Prototype on mock data (no Dataverse yet)
- [x] Define domain models in `src/types/domain-models.ts`: `DocumentRecord`, `DocumentType`, `ReviewSettings`, `ProcessingStatus`, `ReviewStatus` enums, and an `ExtractedData = Record<string, unknown>` (variable JSON) type.
- [x] Extend the data contract in `src/services/data-contracts.ts` with provider methods: list/get/create/update Documents, list Document Types, get/update Review Settings, and a `getSourceFileUrl(documentId)` (mock returns a sample asset).
- [x] Extend `src/services/mock-data-provider.ts` with seed data: several Documents across `Processed` / `Queued` / `Failed`, including **two genuinely different `Extracted Data` shapes** — a Receipt (merchant, date, total, an `items[]` array of `{description, qty, price}`) and an Invoice (vendor, invoiceNumber, dueDate, lineItems array, nested `billTo` object). Include at least one flagged-and-processed Document for the Review Queue, and a `Default` Review Settings row (1, 20, 7).
- [x] Wire `src/services/providerFactory.ts` to keep returning the mock provider for now.
- [x] Build the **random-draw hook** `src/hooks/useRandomReviewDraw.ts` (or fold into a `useCreateDocument` hook): read current Review Settings → draw an inclusive integer in `[rangeMin, rangeMax]` (`Math.floor(Math.random() * (max - min + 1)) + min`) → set `Random Draw Value`; if it equals `Trigger Value`, set `Flagged For Review = true` and `Review Status = Pending Review`, else `Review Status = Not Required`; always set `Processing Status = Queued`. Keep the draw logic in one pure, unit-testable function.
- [x] Build the **Dynamic Field Editor** in `src/components/` — the centerpiece. A recursive renderer that maps JSON value shapes to Fluent UI v9 controls:
  - string → `Input` (date-looking string → `DatePicker`)
  - number → numeric `Input` (or `SpinButton`)
  - boolean → `Switch`
  - array of objects → editable `DataGrid`/table (add/remove rows)
  - array of primitives → tag/list editor
  - nested object → collapsible section (recurse)
  - Labels = prettified JSON keys. Edits update an in-memory JSON object and are saved back to `Extracted Data`. **Never render raw JSON.** Include a read-only render mode too.
  - Add unit tests for the value→control inference and for round-tripping edits.
- [x] Build the **Source File viewer** component (mock: render a sample image inline and a sample PDF via `<object>`/`<iframe>`; abstract behind a `getSourceFileUrl` call so it swaps to real data later).
- [x] Build screens under `src/pages/` with `HashRouter` routes:
  - **Dashboard** — counts by Processing Status, review backlog (Pending Review) count, recent uploads.
  - **Documents** — list + filters (status, flagged) + **Upload** (Fluent file input; on submit, default name from file, run the draw hook, set `Queued`).
  - **Document Detail** — Source File viewer + status chips + Dynamic Field Editor (read-only unless in review) + metadata.
  - **Review Queue** — only `Flagged AND Processed AND Pending Review`; open → `In Review`; edit extracted data; Approve / Reject (reject requires comment); set `Reviewed On`.
  - **Admin Settings** — edit Review Settings (validate `Range Min ≤ Trigger Value ≤ Range Max`, all ≥ 1) and manage Document Types (Admin only).
  - **Skill Updates** *(added in prototype review, ADR 0005)* — Reviewer/Admin; lists Skill Update Requests raised on rejection with their `Skill Update Status` lifecycle (`New → In Progress → Completed → Dismissed`), a status filter, and a per-row status menu. Rejecting a Document now opens a **dialog** asking what to improve in the agent skill (required) instead of an always-visible comment box; confirming creates a Skill Update Request.
- [x] Keep the **three-layer architecture**: components render, hooks orchestrate, services expose the provider contract. Components never call generated services directly.
- [x] Make it **beautiful**: consistent Fluent UI v9 theming, status colors, empty states, loading skeletons, responsive layout.
- [x] `npm run build` passes (prebuild hook enforces HashRouter + relative base). Add/keep component tests green (`vitest`), and an e2e smoke test in `tests/e2e/`.
- [x] **Validate the prototype with the user** (per `00d`) before provisioning Dataverse. Capture any UX changes in `dataverse/prototype-feedback.md` and reflect schema impacts back into the payload.

#### Phase 2.5 — Post-prototype scope additions (DONE — all on mock, deployed)
These were requested during prototype review and are already built, tested, and deployed. They are
**reflected in `planning-payload.json` and the schema**, so Phase 3/4 must carry them through:
- [x] **Skill Update Request** table + **Skill Update Status** option set + `Skill Update Request → Document` lookup (ADR 0005). Reviewer/Admin **Skill Updates** screen with status lifecycle + filter; rejection raises a request via a dialog.
- [x] **Failed documents enter the review queue** with a distinct reason. `src/utils/reviewQueue.ts` (pure, tested) returns `reviewReason -> 'sampled' | 'failed' | null`; the queue/workspace show a red “Processing failed” vs blue “Random sample” badge; failed docs offer Re-queue/Reject (no editor).
- [x] **Changed-field highlight**: the Dynamic Field Editor takes an optional `original` snapshot and highlights edited leaves green during review.
- [x] **Document preview popup**: `src/components/DocumentPreviewDialog.tsx` — clicking a document on the Skill Updates screen opens a read-only modal (source file + extracted data) in place.
- [x] **D365-style design language**: custom Fluent brand theme in `src/theme.ts` (navy→blue), dark top bar + sectioned nav, greeting/hero dashboard.

### Phase 3 — Provision Dataverse  *(HARD GATE: Dataverse-skills plugin must be installed & verified — see `00-prereq-gate` Step 8)*
- [ ] Run existing-schema discovery (`07a`): `list_tables` / `describe_table` to confirm nothing OOB already covers these tables; prefer reuse where sensible (the 4 tables here are app-specific, so new tables are expected).
- [ ] Provision the 3 option sets, then the 4 tables + columns (including the **File column** and the **Memo** for JSON) via `dv-metadata`, driven by `planning-payload.json`. Pass `solution="HITLSkillUpdate"` on every call so artifacts land in the solution (not the Default solution).
- [ ] Provision the lookup relationships (`Document → Document Type`, `Skill Update Request → Document`).
- [ ] Seed Document Types (Receipt, Invoice) and the `Default` Review Settings row via `dv-data`.
- [ ] Create the three security roles (Uploader / Reviewer / Admin) via `dv-security`; set table privileges and ownership depth per decision #11. No business units / owner teams / Entra groups (org structure intentionally empty).

### Phase 4 — Connect real data
- [ ] `pac code add-data-source` for each of the 4 tables → generated SDK lands in `src/generated/` (**read-only — never edit**).
- [ ] Implement `src/services/real-data-provider.ts` behind the **same contract** as the mock provider (wrap generated services in adapters). The contract lives in `src/services/data-contracts.ts` (`AppDataProvider`) — implement **every** member; the current file has typed throwing stubs to replace:
  - `documents`: `list()`, `getById(id)`, `create(CreateDocumentInput)`, `update(id, Partial<DocumentRecord>)`
  - `documentTypes`: `list()`, `create(...)`, `update(id, ...)`
  - `reviewSettings`: `get()` (single-row; create the `Default` row lazily if absent), `update(...)`
  - `skillUpdateRequests`: `list()`, `getById(id)`, `create(CreateSkillUpdateRequestInput)`, `update(id, Partial<SkillUpdateRequest>)`
  - `sourceFiles.getSourceFileUrl(documentId)`: resolve a displayable URL for the File column (image inline; PDF via object/iframe; handle large-file/download tokens)
  - `fieldMetadata.getField(...)`: already wired to `getFieldMetadata` from `field-metadata-cache.ts`
  - Map connector option-set ints ↔ the `ProcessingStatus` / `ReviewStatus` / `SkillUpdateStatus` enums (base `720670000`), and parse/stringify the **Extracted Data** Memo JSON ↔ `ExtractedData`.
- [ ] Flip `providerFactory.ts` to the real provider. It already keys off `VITE_USE_MOCK` (defaults to mock; set `VITE_USE_MOCK=false` for real). Keep the mock path working for demos.
- [ ] Apply the **`DataverseFieldLabel` metadata pattern** (`09-form-field-pattern`) to true Dataverse-bound inputs — the **Review Settings** form (Range Min/Max, Trigger Value) and the **Reject dialog's** comment (`Review Comment`). Register each table's `getMetadata` in `fieldMetadataServiceRegistry` (in `field-metadata-cache.ts`). **Note:** the Dynamic Field Editor's fields are JSON keys, **not** Dataverse columns, so the label pattern does **not** apply to them.
- [ ] Wire the Source File viewer to render the real stored file via `getSourceFileUrl` (the component already consumes that contract — no UI change expected).
- [ ] Re-run the random-draw on real create; confirm `Random Draw Value`, `Flagged For Review`, `Review Status`, and `Processing Status = Queued` all persist.
- [ ] Confirm the **review-queue rules survive the round-trip**: failed docs appear with the red reason badge, sampled docs with blue; rejecting a (sampled or failed) doc writes `Review Status = Rejected` AND creates a Skill Update Request row.
- [ ] `npm run build` + `pac code push -s "HITLSkillUpdate"` to deploy. Smoke-test end to end. (The wizard's `npm run deploy` already injects `-s`; note the `pacaf-pac-safe` wrapper currently crashes on a missing dep, so the working deploy is `npm run build && pac code push -s "HITLSkillUpdate"`.)

### Phase 5 — Handoff seams for the external flow (verify, don't build)
- [ ] Confirm the app sets `Processing Status = Queued` on create so the external Power Automate flow can trigger.
- [ ] Confirm the app reads back `Document Type`, `Extracted Data`, `Processed On`, and (on failure) `Processing Error` written by the Agent, and reflects them in the UI.
- [ ] Provide a way to **re-queue** a `Failed` Document (set status back to `Queued`).

---

## 5. Verification checklist (acceptance)
- [ ] Uploading a file creates a Document with a stored Random Draw Value and `Processing Status = Queued`; forcing the draw to equal the Trigger Value flags it and sets `Review Status = Pending Review`.
- [ ] The Dynamic Field Editor renders correct controls for a Receipt payload vs an Invoice payload (including an editable table for the line-items array and a collapsible nested object) and round-trips edits back into the JSON — with no raw JSON ever shown.
- [ ] Changing Range/Trigger in Admin Settings changes the behavior of subsequent uploads.
- [ ] The Review Queue lists only flagged + processed + pending Documents; approve/reject updates Review Status and `Reviewed On`; reject requires a comment.
- [ ] The original uploaded file displays back on the Document Detail screen.
- [ ] `npm run build` passes (HashRouter, relative base, no `BrowserRouter`); `pac code push` deploys successfully.

---

## 6. Scope boundaries
- **In scope:** upload + file storage/display, random draw + capture, configurable Review Settings, the Dynamic Field Editor, the review loop, the 5 screens, the 3 roles, mock→real data swap.
- **Out of scope (explicit):** document processing / content extraction, the classification/extraction **Agent**, and the **Power Automate flow** that orchestrates it. The app only sets the trigger (`Processing Status = Queued`) and consumes the JSON the Agent writes back.

---

## 7. Handoff to the Dataverse execution session

> The prototype (Phases 0–2 + 2.5) is **done, validated, and deployed on the mock provider**. This
> section is the complete brief for the session that will **provision Dataverse and wire the app to
> real data** (Phases 3 → 4 → 5). Work top-to-bottom; everything you need is in this repo.

### 7.1 Locked project identity (do not change)
| Key | Value |
|---|---|
| Publisher prefix | `msfthitl` |
| Choice-value base | `720670000` |
| Solution unique name | `HITLSkillUpdate` |
| Dev environment | `https://carremacodeapps.crm.dynamics.com` |
| App | `HITL Skill Improvement` (appId `393b3d88-1865-4a85-a7e1-f7eba7af52d2`) |

Every `dv-metadata` / `dv-data` / `dv-security` call passes `solution="HITLSkillUpdate"`. Every deploy is `npm run build && pac code push -s "HITLSkillUpdate"`.

### 7.2 HARD GATE before any Dataverse work
Per `.github/instructions/00-prereq-gate.instructions.md` Step 8, **stop** until the **Dataverse-skills plugin** is installed and verified:
1. Plugin files present (`~/.copilot/installed-plugins/awesome-copilot/dataverse/skills/`).
2. Python SDK importable: `python3 -c "import pandas, PowerPlatform_Dataverse_Client"`.
3. A Dataverse MCP tool call (e.g. `list_tables`) actually succeeds (requires an editor restart after install).

If not installed: GitHub Copilot CLI → `/plugin install dataverse@awesome-copilot`; then `pip install PowerPlatform-Dataverse-Client pandas`; restart the editor. Do **not** hand-roll Web API calls as a workaround.

### 7.3 Source of truth
- **Schema** → `dataverse/planning-payload.json` (4 tables, 3 option sets, 2 lookups, seed data, 3 security roles). Read it and drive `dv-metadata` from it; do not invent columns.
- **Vocabulary** → `CONTEXT.md`. **Locked decisions** → `docs/adr/0001`–`0005`. **UX findings** → `dataverse/prototype-feedback.md`.
- **UI-facing contract the real provider must satisfy** → `src/services/data-contracts.ts` (`AppDataProvider`).

### 7.4 What to build (the checklists above, in order)
1. **Phase 3 — provision** (07a discovery → 3 option sets → 4 tables incl. the **File column** `msfthitl_sourcefile` and the **Memo** JSON `msfthitl_extracteddata` → 2 lookups → seed Document Types + `Default` Review Settings → 3 security roles). Org structure is intentionally empty (decision #11) — no business units / owner teams / Entra groups.
2. **Phase 4 — connect** (`pac code add-data-source` ×4 → implement `real-data-provider.ts` against the §Phase 4 contract checklist → flip `VITE_USE_MOCK=false` → apply `DataverseFieldLabel` to Review Settings + Reject comment → deploy).
3. **Phase 5 — verify handoff seams** (app sets `Queued` on create; reads back `Document Type` / `Extracted Data` / `Processed On` / `Processing Error`; failed docs can be re-queued).

### 7.5 Guardrails (unchanged)
HashRouter only · three-layer architecture (components → hooks → provider; never call generated services from components) · Fluent UI v9 only · `src/generated/**` is read-only · port 3000 · no secrets in source. Keep the mock provider working (demo flag). After wiring, the **acceptance checklist in §5** must pass against real data.

### 7.6 Definition of done
All §5 boxes green against Dataverse; `npm run build` clean; `pac code push -s "HITLSkillUpdate"` deploys; the external Power Automate flow can trigger off `Processing Status = Queued` and its write-backs surface in the UI. Update the checkboxes in this file as you go.
