# Rejection raises a Skill Update Request to improve the agent skill

**Status:** accepted

When a reviewer **rejects** a Document, the app does not merely record a free-text review comment —
it opens a dialog asking what should be improved in the underlying **agent skill**, and creates a
dedicated **Skill Update Request** record (its own table) carrying that **Suggested Fix** and a
processing lifecycle (`New → In Progress → Completed → Dismissed`). A separate **Skill Updates**
screen tracks these requests. The always-visible review-comment box on the review screen is removed
in favor of this rejection-only dialog.

This makes the human-in-the-loop rejection a structured feedback loop into the agent skill rather
than an inert note, which is the core premise of the app ("HITL Skill Update").

**Considered options:** keep the inline `Review Comment` on the Document only (simplest, but the
feedback is buried per-record and has no status/tracking); a generic comments/annotations thread on
the Document (queryable but unstructured, no lifecycle); the chosen dedicated table with a status
lifecycle (one more table, but the feedback becomes trackable, reportable, and ownable).

**Consequences:** A new `Skill Update Request` table, a new `Skill Update Status` option set, and a
`Skill Update Request → Document` lookup are added to the schema. The Document's `Review Comment`
column is retained for the audit trail (the Suggested Fix text is also copied there on reject), but
the reviewer no longer edits it directly. Implementing the fix in the agent skill remains out of
scope — the app only captures and tracks the request.
