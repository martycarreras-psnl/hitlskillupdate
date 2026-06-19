"""
Phase 3 (seed) — idempotent seed data for HITL Skill Update.

Document Types (Receipt, Invoice) and the single Default Review Settings row,
per dataverse/planning-payload.json seedData. Uses the Dataverse-skills SDK.
Data records are not solution components, so no solution header is needed.
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import get_client  # noqa: E402

client = get_client("dv-data")


def existing_names(table, name_field):
    names = set()
    for page in client.records.get(table, select=[name_field], top=200):
        for rec in page:
            v = rec.get(name_field)
            if v:
                names.add(v)
    return names


def main():
    with open(os.path.join("dataverse", "planning-payload.json"), encoding="utf-8") as f:
        seed = json.load(f)["seedData"]

    # ── Document Types (entity logical name: msfthitl_documenttype) ──
    dt_existing = existing_names("msfthitl_documenttype", "msfthitl_documenttypename")
    for row in seed["msfthitl_documenttypes"]:
        name = row["msfthitl_documenttypename"]
        if name in dt_existing:
            print(f"  = exists   Document Type '{name}'")
            continue
        client.records.create("msfthitl_documenttype", row)
        print(f"  + created  Document Type '{name}'")

    # ── Review Settings (entity logical name: msfthitl_reviewsetting) ──
    rs_existing = existing_names("msfthitl_reviewsetting", "msfthitl_reviewsettingsname")
    for row in seed["msfthitl_reviewsettings"]:
        name = row["msfthitl_reviewsettingsname"]
        if name in rs_existing:
            print(f"  = exists   Review Settings '{name}'")
            continue
        client.records.create("msfthitl_reviewsetting", row)
        print(f"  + created  Review Settings '{name}' (min={row['msfthitl_rangemin']}, "
              f"max={row['msfthitl_rangemax']}, trigger={row['msfthitl_triggervalue']})")

    print("Seed complete.")


if __name__ == "__main__":
    main()
