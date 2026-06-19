# Random review draw happens in the app at record creation

**Status:** accepted

The random number that decides human-in-the-loop review is generated **client-side in the Code
App at the moment a Document is created**, and the drawn value is **stored** on the record. The app
reads the current Review Settings, draws an inclusive integer in `[Range Min, Range Max]`, and if it
equals the configured `Trigger Value`, flags the Document for review.

**Considered options:** draw after processing completes (so review only applies to records that have
extracted JSON); draw in the Power Automate flow. We chose draw-at-creation-in-app because the
requirement explicitly states the application owns this behavior and that the draw must happen for
every record as it is created, with the number captured.

**Consequences:** A Document can be flagged before the Agent has produced any JSON to review, so the
actionable Review Queue filters to `Flagged AND Processed AND Pending Review`. The draw uses
`Math.random` (statistical sampling, not security-sensitive), which is acceptable. Because the value
is persisted, the sampling decision is auditable.
