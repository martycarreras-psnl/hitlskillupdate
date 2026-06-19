# Extracted data stored as JSON in a Dataverse text column

**Status:** accepted

The variable information extracted from each document is stored as a **JSON string in a Dataverse
Memo (multiline text) column** (`Extracted Data`, up to ~1 MB), rather than modeled as typed
columns or a child table. The shape differs by document type (a receipt's fields differ from an
invoice's) and new types can appear at any time as the Agent invents them, so a fixed relational
schema would be wrong.

**Considered options:** typed columns per field (impossible — the schema is open-ended); a generic
key/value child table (queryable but heavy and still loses structure like nested objects and
arrays). We chose JSON-in-text for maximum flexibility and zero schema churn when a new document
type appears.

**Consequences:** The data is not directly queryable/aggregatable by field in Dataverse views. The
app renders and edits it through the Dynamic Field Editor ([ADR 0004](0004-infer-form-from-json.md)),
never as raw JSON. If field-level reporting becomes a requirement later, a projection/extract step
would be added — it does not change this storage decision.
