# Prototype Feedback

Generated from /dataverse/planning-payload.json. Update this file during prototype reviews, then feed decisions back into dataverse/planning-payload.json before schema provisioning.

## Reviewed Flows
- Phase 2 prototype built on the mock provider and validated in-browser (mock dev server, port 3000):
  - Dashboard — counts by Processing Status, review backlog tile, recent uploads.
  - Documents — list + filters (status, flagged-only, search) + Upload (file picker → review draw → Queued, toast shows drawn value/flag).
  - Document Detail — Source File viewer + status chips + read-only Dynamic Field Editor + metadata; "waiting for processing" state for flagged-but-unprocessed; Re-queue for Failed.
  - Review Queue — actionable list = Flagged AND Processed AND Pending Review; separate "waiting for processing" section.
  - Review Workspace (/review/:id) — opens → In Review; editable Dynamic Field Editor; Approve / Reject (reject requires comment) → sets Review Status + Reviewed On.
  - Admin Settings — Review Settings with validation (Range Min ≤ Trigger ≤ Range Max, all ≥ 1) + Document Type management. Role-gated via in-app role switcher (Uploader / Reviewer / Admin).

## What Worked Immediately
- Dynamic Field Editor inference confirmed against two genuinely different shapes: Receipt (string/date/number/boolean, `tags[]` primitive array, `items[]` editable table) and Invoice (nested `billTo` object as a collapsible section, `lineItems[]` table, `poNumbers[]` array). No raw JSON ever shown; read-only mode disables inputs and hides add/remove.
- Random review draw is one pure, unit-tested function; flag-on-trigger behavior verified by tests and by the seeded flagged record.
- 35 unit/component tests green; `npm run build` (HashRouter + relative-base prebuild guard + typecheck) green; lint clean.
- Source File viewer: SVG receipt renders inline; PDF uses `<object>` with a graceful download fallback (the embedded VS Code browser lacks a PDF plugin — renders in a real browser / the Power Apps iframe).

## Points of Confusion or Friction
- PDF inline preview depends on the host browser's PDF viewer; fallback link is always available. Confirm acceptable for reviewers, or consider a JS PDF renderer in a later phase.
- Number editing uses native numeric inputs; decimal entry is fine via the spinbutton. Revisit only if reviewers want currency formatting.

## Data Model Changes Suggested by the Prototype
- Fields to add, remove, merge, or rename: none — the payload's columns covered every screen with no gaps.
- Relationship changes: none.
- Lifecycle or status changes: none — Processing Status and Review Status transitions matched the UI needs.
- Reporting or rollup needs: Dashboard counts are computed client-side from the document list; no schema change required for the prototype.

### Stakeholder change (2026-06-18) — Skill Update Requests (applied, ADR 0005)
- **New table `Skill Update Request`** (User-owned): `Name`, `Document` (lookup → Document), `Document Type` (text snapshot), `Suggested Fix` (memo), `Skill Update Status` (choice), `Requested On`, `Resolved On`.
- **New option set `Skill Update Status`**: `New → In Progress → Completed → Dismissed` (base 720670000).
- **New relationship** `Skill Update Request → Document`.
- **UX change**: removed the always-visible Review Comment box on the review screen; **Reject** now opens a dialog asking what to improve in the agent skill (required). Confirming sets the Document to Rejected and **creates a Skill Update Request**.
- **New screen `Skill Updates`** (Reviewer/Admin): lists requests with status chips, a status filter, and a per-row status-change menu.
- Payload, `CONTEXT.md`, and ADR 0005 updated. Reviewer/Admin security roles extended to cover the new table. Still mock-only; 40 tests + build + lint green.

## Decision Log
- [ ] Update planning payload now  *(no schema changes surfaced — payload unchanged)*
- [ ] Defer to later phase
- [ ] Reject proposed change

## Promotion Checklist
- [x] Primary workflow feels natural in the UI
- [x] Empty, error, and exception states are represented
- [x] Field names and record boundaries still make sense
- [x] Reporting needs have been surfaced
- [ ] Planning payload has been updated after prototype review  *(no changes needed; awaiting user sign-off before Phase 3)*
