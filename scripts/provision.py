"""
Phase 3 — Dataverse schema provisioning for HITL Skill Update.

Idempotent. Driven by dataverse/planning-payload.json (the source of truth).
Uses the Dataverse-skills plugin auth (scripts/auth.py) + raw Web API (urllib),
because the schema needs global option sets, a File column with MaxSizeInKB, a
1 MB Memo, integer MinValue, HasNotes, and boolean defaults — all beyond the SDK
column helpers. Every create carries the MSCRM.SolutionUniqueName header so the
artifacts land in the HITLSkillUpdate solution (not the Default solution).

Phased to avoid metadata lock contention:
  1. global option sets
  2. tables (primary name only)        -> wait
  3. columns per table                 -> wait
  4. lookups (1:N relationships)
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import get_plugin_headers, get_token, load_env  # noqa: E402

load_env()
BASE = os.environ["DATAVERSE_URL"].rstrip("/") + "/api/data/v9.2"
SOLUTION = os.environ.get("SOLUTION_NAME", "HITLSkillUpdate")
LCID = 1033


def label(text):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [
            {
                "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
                "Label": text,
                "LanguageCode": LCID,
            }
        ],
    }


def _headers():
    h = get_plugin_headers("dv-metadata", get_token())
    h["Content-Type"] = "application/json"
    h["Accept"] = "application/json"
    h["OData-MaxVersion"] = "4.0"
    h["OData-Version"] = "4.0"
    h["MSCRM.SolutionUniqueName"] = SOLUTION
    return h


def request(method, path, body=None):
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            txt = resp.read().decode("utf-8")
            return resp.status, (json.loads(txt) if txt.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def exists(path):
    status, _ = request("GET", path)
    return status == 200


_optionset_id_cache = {}


def optionset_metadata_id(name):
    if name in _optionset_id_cache:
        return _optionset_id_cache[name]
    status, payload = request("GET", f"/GlobalOptionSetDefinitions(Name='{name}')?$select=MetadataId")
    if status == 200 and isinstance(payload, dict):
        mid = payload.get("MetadataId")
        _optionset_id_cache[name] = mid
        return mid
    raise RuntimeError(f"Could not resolve MetadataId for global option set {name}: HTTP {status}")


def create_with_retry(path, body, what, retries=4):
    for attempt in range(1, retries + 1):
        status, payload = request("POST", path, body)
        if status in (200, 201, 204):
            print(f"  + created {what}")
            return True
        text = payload if isinstance(payload, str) else json.dumps(payload)
        if "0x80040237" in text or "already exists" in text.lower() or "duplicate" in text.lower():
            print(f"  = exists   {what}")
            return True
        transient = any(c in text for c in ("0x80040216", "0x80060891", "another customization", "lock"))
        if transient and attempt < retries:
            wait = 5 * attempt
            print(f"  ~ transient on {what} (attempt {attempt}); retrying in {wait}s")
            time.sleep(wait)
            continue
        print(f"  ! FAILED {what}: HTTP {status} {text[:400]}")
        return False
    return False


# ─────────────────────────────────────────────────────────── option sets ──

def option_set_body(spec):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
        "Name": spec["globalOptionSetName"],
        "DisplayName": label(spec["displayName"]),
        "Description": label(spec.get("description", "")),
        "OptionSetType": "Picklist",
        "IsGlobal": True,
        "Options": [
            {
                "Value": o["value"],
                "Label": label(o["label"]),
                "Description": label(o.get("description", "")),
            }
            for o in spec["options"]
        ],
    }


def provision_option_sets(payload):
    print("PHASE 1 — global option sets")
    for spec in payload["optionSets"]:
        name = spec["globalOptionSetName"]
        if exists(f"/GlobalOptionSetDefinitions(Name='{name}')"):
            print(f"  = exists   option set {name}")
            reconcile_option_set(spec)
            continue
        create_with_retry("/GlobalOptionSetDefinitions", option_set_body(spec), f"option set {name}")


def reconcile_option_set(spec):
    """Insert any option values present in the payload but missing on an existing set.
    Makes the option-set phase idempotent when new choices are added over time."""
    name = spec["globalOptionSetName"]
    status, payload = request("GET", f"/GlobalOptionSetDefinitions(Name='{name}')?$select=Name")
    if status != 200 or not isinstance(payload, dict):
        print(f"    ! could not read existing options for {name}: HTTP {status}")
        return
    existing = {o.get("Value") for o in payload.get("Options", [])}
    for o in spec["options"]:
        if o["value"] in existing:
            continue
        body = {
            "OptionSetName": name,
            "Value": o["value"],
            "Label": label(o["label"]),
            "Description": label(o.get("description", "")),
            "SolutionUniqueName": SOLUTION,
        }
        create_with_retry("/InsertOptionValue", body, f"option {o['label']} ({o['value']}) on {name}")


# ─────────────────────────────────────────────────────────────── tables ──

def primary_name_attr(spec):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "SchemaName": spec["schemaName"],
        "DisplayName": label(spec["displayName"]),
        "Description": label(spec.get("description", "")),
        "RequiredLevel": {"Value": "ApplicationRequired"},
        "MaxLength": spec.get("maxLength", 100),
        "FormatName": {"Value": "Text"},
        "IsPrimaryName": True,
    }


def table_body(t):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        "SchemaName": t["schemaName"],
        "DisplayName": label(t["displayName"]),
        "DisplayCollectionName": label(t["displayCollectionName"]),
        "Description": label(t.get("description", "")),
        "OwnershipType": "UserOwned",
        "IsActivity": False,
        "HasActivities": False,
        "HasNotes": bool(t.get("hasNotes", False)),
        "PrimaryNameAttribute": t["primaryName"]["schemaName"].lower(),
        "Attributes": [primary_name_attr(t["primaryName"])],
    }


def provision_tables(payload):
    print("PHASE 2 — tables (primary name only)")
    for t in payload["tables"]:
        logical = t["logicalSingularName"]
        if exists(f"/EntityDefinitions(LogicalName='{logical}')"):
            print(f"  = exists   table {logical}")
            continue
        create_with_retry("/EntityDefinitions", table_body(t), f"table {logical}")


# ────────────────────────────────────────────────────────────── columns ──

def column_body(col):
    t = col["type"]
    name = col["schemaName"]
    req = {"Value": col.get("requiredLevel", "None")}
    common = {"SchemaName": name, "DisplayName": label(col["displayName"]),
              "Description": label(col.get("description", "")), "RequiredLevel": req}

    if t == "File":
        return {"@odata.type": "Microsoft.Dynamics.CRM.FileAttributeMetadata",
                "MaxSizeInKB": col.get("maxSizeInKB", 32768), **common}
    if t == "Memo":
        return {"@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
                "MaxLength": col.get("maxLength", 2000),
                "Format": col.get("format", "TextArea"), **common}
    if t == "Integer":
        body = {"@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
                "MinValue": col.get("minValue", -2147483648),
                "MaxValue": col.get("maxValue", 2147483647), **common}
        return body
    if t == "Boolean":
        return {"@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
                "DefaultValue": bool(col.get("defaultValue", False)),
                "OptionSet": {
                    "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
                    "TrueOption": {"Value": 1, "Label": label("Yes")},
                    "FalseOption": {"Value": 0, "Label": label("No")},
                }, **common}
    if t == "DateTime":
        return {"@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
                "Format": col.get("format", "DateAndTime"),
                "DateTimeBehavior": {"Value": "UserLocal"}, **common}
    if t == "String":
        return {"@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                "MaxLength": col.get("maxLength", 100),
                "FormatName": {"Value": "Text"}, **common}
    if t == "AutoNumber":
        # Autonumber is a String column with an AutoNumberFormat. Dataverse
        # generates the value on create; the app never writes it (RequiredLevel None).
        return {"@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                "MaxLength": col.get("maxLength", 100),
                "FormatName": {"Value": "Text"},
                "AutoNumberFormat": col["autoNumberFormat"], **common}
    if t == "Picklist":
        mid = optionset_metadata_id(col["globalOptionSetName"])
        return {"@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
                "GlobalOptionSet@odata.bind":
                    f"/GlobalOptionSetDefinitions({mid})", **common}
    raise ValueError(f"Unsupported column type for Web API: {t} ({name})")


def provision_columns(payload):
    print("PHASE 3 — columns")
    for t in payload["tables"]:
        logical = t["logicalSingularName"]
        attr_path = f"/EntityDefinitions(LogicalName='{logical}')/Attributes"
        print(f"  table {logical}")
        for col in t["columns"]:
            if col["type"] == "Lookup":
                continue  # lookups handled in phase 4
            ln = col["logicalName"]
            if exists(f"{attr_path}(LogicalName='{ln}')"):
                print(f"    = exists   {ln}")
                continue
            create_with_retry(attr_path, column_body(col), f"{logical}.{ln}")


# ────────────────────────────────────────────────────────────── lookups ──

def provision_lookups(payload):
    print("PHASE 4 — lookups (1:N relationships)")
    # map referencing table -> its lookup column spec
    lookup_cols = {}
    for t in payload["tables"]:
        for col in t["columns"]:
            if col["type"] == "Lookup":
                lookup_cols[(t["logicalSingularName"], col["schemaName"])] = col

    for rel in payload["relationships"]:
        schema = rel["schemaName"]
        referencing = rel["referencingEntity"]   # plural logical in payload; need singular
        # payload uses *_documents (plural); EntityDefinitions wants singular logical name
        ref_table = next(t for t in payload["tables"]
                         if t["logicalPluralName"] == rel["referencingEntity"]
                         or t["logicalSingularName"] == rel["referencingEntity"])
        target_table = next(t for t in payload["tables"]
                            if t["logicalPluralName"] == rel["referencedEntity"]
                            or t["logicalSingularName"] == rel["referencedEntity"])
        referencing_singular = ref_table["logicalSingularName"]
        referenced_singular = target_table["logicalSingularName"]
        lookup_schema = rel["lookupSchemaName"]
        lookup_logical = lookup_schema.lower()
        col = lookup_cols.get((referencing_singular, lookup_schema))
        required = col.get("requiredLevel", "None") if col else "None"
        display = rel.get("lookupDisplayName", "Lookup")

        # idempotent: skip if lookup column already on the referencing table
        if exists(f"/EntityDefinitions(LogicalName='{referencing_singular}')/Attributes(LogicalName='{lookup_logical}')"):
            print(f"  = exists   lookup {referencing_singular}.{lookup_logical}")
            continue

        body = {
            "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
            "SchemaName": schema,
            "ReferencedEntity": referenced_singular,
            "ReferencingEntity": referencing_singular,
            "Lookup": {
                "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
                "SchemaName": lookup_schema,
                "DisplayName": label(display),
                "RequiredLevel": {"Value": required},
            },
        }
        create_with_retry("/RelationshipDefinitions", body, f"lookup {referencing_singular}.{lookup_logical} -> {referenced_singular} ({required})")


def main():
    payload_path = os.path.join("dataverse", "planning-payload.json")
    with open(payload_path, encoding="utf-8") as f:
        payload = json.load(f)

    print(f"Target: {BASE}")
    print(f"Solution: {SOLUTION}\n")

    provision_option_sets(payload)
    print("  waiting 10s for option-set propagation...")
    time.sleep(10)

    provision_tables(payload)
    print("  waiting 25s for table propagation...")
    time.sleep(25)

    provision_columns(payload)
    print("  waiting 25s for column propagation...")
    time.sleep(25)

    provision_lookups(payload)
    print("\nProvisioning complete.")


if __name__ == "__main__":
    main()
