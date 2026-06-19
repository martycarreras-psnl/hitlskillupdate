# Document Intake & Human-in-the-Loop Review

A Power Apps Code App where users upload documents (expense receipts, invoices, and other
types), the app stores the original file plus a variable extracted-data payload, and a
configurable share of records is randomly tagged for human review. The app itself does **not**
read or extract document content — an external Power Automate flow + Agent does that. The app
owns upload, the random review draw, a dynamic field editor, and the review loop.

## Language

**Document**:
A single uploaded file (receipt, invoice, etc.) and everything the system knows about it —
the stored source file, its extracted data, its processing status, and its review state.
One file per Document.
_Avoid_: file, attachment, upload (as the record noun)

**Source File**:
The original binary the user uploaded (PDF or image), stored on the Document record so it can
be displayed back to a user looking at that record.
_Avoid_: attachment, document (the file alone is not the Document record)

**Extracted Data**:
The variable, schema-less information pulled from the Source File, stored as JSON because the
shape differs by document type (a receipt's fields differ from an invoice's). Written by the
external Agent, edited by reviewers through generated controls — never shown as raw JSON.
_Avoid_: metadata, payload, OCR result

**Document Type**:
A configurable, admin-managed category of document (Receipt, Invoice, …). Determined by the
Agent during processing, not chosen by the uploader. New types can be added without a code change.
_Avoid_: category, kind, classification

**Processing Status**:
The single lifecycle field that drives the Agent handoff: `Uploaded → Queued → Processing →
Processed → Failed`. The app sets `Queued`; the external Power Automate flow watches for `Queued`
and advances the rest.
_Avoid_: state, stage, trigger flag

**Random Draw**:
An integer the **app** generates at record creation, sampled uniformly within the configured
range. It is stored on the Document (captured) for transparency/audit.
_Avoid_: lottery number, random, dice roll

**Trigger Value**:
The configured "lucky" number (e.g. 7). When a Document's Random Draw equals the Trigger Value,
the Document is flagged for human review.
_Avoid_: magic number, target, winning number

**Review Settings**:
A single configuration record holding `Range Min`, `Range Max`, and `Trigger Value`, edited by an
Admin in-app at runtime. The Random Draw reads the current settings each time.
_Avoid_: config, options, parameters

**Flagged For Review**:
The boolean state of a Document whose Random Draw matched the Trigger Value. A flagged Document
enters the human-in-the-loop review loop.
_Avoid_: marked, selected, sampled

**Review Status**:
The state of the human review loop on a flagged Document: `Not Required → Pending Review →
In Review → Approved → Rejected`.
_Avoid_: approval state, QA status

**Reviewer**:
A user who works the Review Queue — viewing the Source File, correcting Extracted Data through
generated controls, and approving or rejecting with a comment.
_Avoid_: approver, checker

**Uploader**:
A user who submits Documents. Sees their own Documents and their processing status.
_Avoid_: submitter, creator

**Dynamic Field Editor**:
The app component that renders the Extracted Data as appropriate Fluent UI controls inferred from
the JSON value shapes (text, number, toggle, date picker, editable table for arrays, collapsible
section for nested objects) and writes edits back into the JSON. The raw JSON is never displayed.
_Avoid_: JSON editor, form builder

**Skill Update Request**:
A reviewer's suggested improvement to the underlying agent skill, raised when a Document is
rejected. It captures what should change in the agent's skill (the **Suggested Fix**) and is
tracked through its own processing lifecycle. The app records the request; implementing the fix in
the agent skill is out of scope.
_Avoid_: feedback, ticket, bug, skill ticket

**Suggested Fix**:
The reviewer's free-text description, entered in the rejection dialog, of what the agent skill
should do differently. Stored on the Skill Update Request.
_Avoid_: comment, note, correction

**Skill Update Status**:
The processing lifecycle of a Skill Update Request: `New → In Progress → Completed → Dismissed`.
Surfaced on the Skill Updates screen so the team can track which agent-skill improvements are
outstanding.
_Avoid_: state, stage
