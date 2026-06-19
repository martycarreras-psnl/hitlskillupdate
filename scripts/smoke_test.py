"""
Phase 4/5 smoke test — exercises the real Dataverse tables with the exact operations
the Code App performs, proving the schema + option-set values + lookup + Memo JSON
round-trip. Creates a throwaway Document, simulates the Agent write-back and the
re-queue path, verifies each step, then deletes the test record.
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import get_client  # noqa: E402

c = get_client("dv-data")

QUEUED, PROCESSING, PROCESSED, FAILED = 720670001, 720670002, 720670003, 720670004
PENDING_REVIEW = 720670001

ok = True


def check(label, cond):
    global ok
    print(f"  {'✓' if cond else '✗'} {label}")
    ok = ok and cond


# Receipt document type id (for the lookup write-back)
receipt = None
for r in c.records.list("msfthitl_documenttype",
                        filter="msfthitl_documenttypename eq 'Receipt'",
                        select=["msfthitl_documenttypeid", "msfthitl_documenttypename"]):
    receipt = r.get("msfthitl_documenttypeid")
print(f"Receipt type id: {receipt}")
check("Receipt document type seeded", bool(receipt))


def rec_id(result):
    return result.id if hasattr(result, "id") else result


# 1) Create a Document the way the app does at upload (draw ran, Queued).
doc_id = rec_id(c.records.create("msfthitl_document", {
    "msfthitl_documentname": "SMOKE-TEST-receipt.pdf",
    "msfthitl_processingstatus": QUEUED,
    "msfthitl_randomdrawvalue": 7,
    "msfthitl_flaggedforreview": True,
    "msfthitl_reviewstatus": PENDING_REVIEW,
}))
print(f"Created document: {doc_id}")

rec = c.records.get("msfthitl_document", doc_id,
                    select=["msfthitl_documentname", "msfthitl_processingstatus",
                            "msfthitl_randomdrawvalue", "msfthitl_flaggedforreview",
                            "msfthitl_reviewstatus"])
check("Processing Status = Queued on create", rec.get("msfthitl_processingstatus") == QUEUED)
check("Random Draw Value captured (7)", rec.get("msfthitl_randomdrawvalue") == 7)
check("Flagged For Review = true", rec.get("msfthitl_flaggedforreview") is True)
check("Review Status = Pending Review", rec.get("msfthitl_reviewstatus") == PENDING_REVIEW)

# 2) Simulate the Agent write-back: Processed + Extracted Data JSON + Document Type lookup.
extracted = {"merchant": "Contoso Cafe", "total": 42.5,
             "items": [{"description": "Coffee", "qty": 2, "price": 4.25}]}
c.records.update("msfthitl_document", doc_id, {
    "msfthitl_processingstatus": PROCESSED,
    "msfthitl_processedon": "2026-06-18T12:00:00Z",
    "msfthitl_extracteddata": json.dumps(extracted),
    "msfthitl_documenttypeid@odata.bind": f"/msfthitl_documenttypes({receipt})",
})
rec = c.records.get("msfthitl_document", doc_id,
                    select=["msfthitl_processingstatus", "msfthitl_extracteddata",
                            "msfthitl_processedon", "_msfthitl_documenttypeid_value"])
check("Processing Status = Processed after write-back", rec.get("msfthitl_processingstatus") == PROCESSED)
parsed = json.loads(rec.get("msfthitl_extracteddata")) if rec.get("msfthitl_extracteddata") else {}
check("Extracted Data JSON round-trips", parsed.get("merchant") == "Contoso Cafe"
      and parsed.get("items", [{}])[0].get("description") == "Coffee")
check("Document Type lookup resolves to Receipt",
      str(rec.get("_msfthitl_documenttypeid_value")).lower() == str(receipt).lower())
check("Processed On set", bool(rec.get("msfthitl_processedon")))

# 3) Simulate a failure, then the app's re-queue (Failed -> Queued, clear error).
c.records.update("msfthitl_document", doc_id, {
    "msfthitl_processingstatus": FAILED,
    "msfthitl_processingerror": "Extraction failed: unreadable scan.",
})
rec = c.records.get("msfthitl_document", doc_id, select=["msfthitl_processingstatus", "msfthitl_processingerror"])
check("Failed state + Processing Error set", rec.get("msfthitl_processingstatus") == FAILED
      and bool(rec.get("msfthitl_processingerror")))

c.records.update("msfthitl_document", doc_id, {
    "msfthitl_processingstatus": QUEUED,
    "msfthitl_processingerror": None,
})
rec = c.records.get("msfthitl_document", doc_id, select=["msfthitl_processingstatus", "msfthitl_processingerror"])
check("Re-queue resets to Queued", rec["msfthitl_processingstatus"] == QUEUED)
check("Re-queue clears Processing Error", not rec.get("msfthitl_processingerror"))

# Cleanup
c.records.delete("msfthitl_document", doc_id)
print(f"Deleted test document: {doc_id}")

print("\nSMOKE TEST:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
