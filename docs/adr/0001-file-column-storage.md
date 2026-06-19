# Source file stored in a Dataverse File column

**Status:** accepted

We store each uploaded document's original binary in a native Dataverse **File column** on the
Document record (one file per record), rather than in Notes/attachments or external Azure Blob
Storage. This keeps the file, the extracted JSON, the random-draw value, and the review state on a
single strongly-typed row, streams through the generated Power Apps SDK, and is the simplest thing
to render back on the record.

**Considered options:** Notes/annotations (supports multiple files but clumsy to render and not
typed); Azure Blob + URL reference (better for very large or many files, but adds a connector and
infrastructure). We chose the File column because each Document has exactly one source file and the
sizes involved (receipts/invoices) fit comfortably.

**Consequences:** One file per Document is a hard constraint — multi-file documents would require a
schema change (move to Blob or a child table). File columns support up to ~128 MB; we cap lower in
the app.
