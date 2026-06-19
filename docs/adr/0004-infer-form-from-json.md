# Edit controls inferred from the JSON, not from a per-type template

**Status:** accepted

The Dynamic Field Editor builds its form by **inferring a control for each value from the JSON's
runtime shape** (string → text/date, number → numeric, boolean → switch, array of objects →
editable table, nested object → collapsible section), with labels derived from prettified JSON
keys. Reviewers correct the extracted data through these controls and the edits are written back
into the JSON. The raw JSON is **never displayed** to the user.

**Considered options:** a per-document-type field template (label/control/order metadata per type)
— nicer labels and control choices, but requires an admin to maintain a template per type and would
hide any field the Agent emits that the template doesn't know about; a hybrid of inference plus
optional per-type overrides — more polish, more work. We chose pure inference so the editor works
for any document type the Agent produces with zero configuration.

**Consequences:** Labels are only as good as the JSON keys, and control choice is heuristic (e.g.
date detection is best-effort). This is an acceptable trade for handling arbitrary, evolving
document shapes with no maintenance. A per-type override layer can be added later without changing
the inference engine if richer labeling is ever needed.
