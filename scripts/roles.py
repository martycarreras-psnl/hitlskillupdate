"""
Phase 3 (security) — create the 3 Dataverse security roles for HITL Skill Update.

Driven by the securityRoles intent in dataverse/planning-payload.json (decision
#11: User/Team owned, no org-owned tables; authorization is delegated entirely to
Dataverse security modeling). The dv-security skill only covers *assigning*
existing roles, so role *creation* with table privileges is done here via the
Web API (role record + AddPrivilegesRole bound action).

These app-specific roles grant ONLY the four custom tables' privileges. Users
also need the platform "Basic User" role (or equivalent) to sign in and use the
Code App — that is assigned separately, not by this script.

Idempotent: skips roles that already exist; re-applying privileges is additive.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import get_plugin_headers, get_token, load_env  # noqa: E402

load_env()
BASE = os.environ["DATAVERSE_URL"].rstrip("/") + "/api/data/v9.2"
SOLUTION = os.environ.get("SOLUTION_NAME", "HITLSkillUpdate")

DOC = "msfthitl_document"
DTYPE = "msfthitl_documenttype"
RSET = "msfthitl_reviewsetting"
SUR = "msfthitl_skillupdaterequest"

# role display name -> { table_logical: { AccessType: Depth } }
# Depth ∈ Basic (own/user), Local (BU), Deep (parent:child BU), Global (org).
ROLES = {
    "Document Intake Uploader": {
        DOC: {"Create": "Basic", "Read": "Basic", "Write": "Basic",
              "Append": "Basic", "AppendTo": "Basic"},
        DTYPE: {"Read": "Global"},
        RSET: {"Read": "Global"},
    },
    "Document Intake Reviewer": {
        DOC: {"Read": "Global", "Write": "Global", "Append": "Global", "AppendTo": "Global"},
        SUR: {"Create": "Global", "Read": "Global", "Write": "Global",
              "Append": "Global", "AppendTo": "Global"},
        DTYPE: {"Read": "Global"},
        RSET: {"Read": "Global"},
    },
    "Document Intake Admin": {
        DOC: {"Create": "Global", "Read": "Global", "Write": "Global", "Delete": "Global",
              "Append": "Global", "AppendTo": "Global", "Assign": "Global", "Share": "Global"},
        DTYPE: {"Create": "Global", "Read": "Global", "Write": "Global", "Delete": "Global"},
        RSET: {"Create": "Global", "Read": "Global", "Write": "Global", "Delete": "Global"},
        SUR: {"Create": "Global", "Read": "Global", "Write": "Global", "Delete": "Global"},
    },
}

ROLE_DESC = {
    "Document Intake Uploader": "Creates documents and sees their own; read-only on Review Settings and Document Types.",
    "Document Intake Reviewer": "Works the review queue: read all Documents, edit extracted data / review fields, approve/reject, and raise Skill Update Requests.",
    "Document Intake Admin": "Full control plus manages Document Types, Review Settings, and Skill Update Requests.",
}


def headers(solution=False):
    h = get_plugin_headers("dv-security", get_token())
    h["Content-Type"] = "application/json"
    h["Accept"] = "application/json"
    h["OData-MaxVersion"] = "4.0"
    h["OData-Version"] = "4.0"
    if solution:
        h["MSCRM.SolutionUniqueName"] = SOLUTION
    return h


def api(method, path, body=None, solution=False):
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers(solution))
    try:
        with urllib.request.urlopen(req) as resp:
            txt = resp.read().decode("utf-8")
            return resp.status, (json.loads(txt) if txt.strip() else None), resp.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8"), None


def whoami_bu():
    status, payload, _ = api("GET", "/WhoAmI")
    if status == 200:
        return payload["BusinessUnitId"]
    raise RuntimeError(f"WhoAmI failed: {status} {payload}")


def load_privileges(tables):
    """Return {privilege_name_lower: privilegeid} for all privileges of the given tables."""
    flt = " or ".join(f"endswith(name,'{t}')" for t in tables)
    privs = {}
    url = "/privileges?$select=name,privilegeid&$filter=" + urllib.parse.quote(flt)
    status, payload, _ = api("GET", url)
    if status != 200:
        raise RuntimeError(f"privilege query failed: {status} {payload}")
    while True:
        for p in payload.get("value", []):
            privs[p["name"].lower()] = p["privilegeid"]
        next_link = payload.get("@odata.nextLink")
        if not next_link:
            break
        status, payload, _ = api("GET", next_link)
    return privs


def get_role_id(name):
    flt = urllib.parse.quote(f"name eq '{name}'")
    status, payload, _ = api("GET", f"/roles?$select=roleid,name&$filter={flt}")
    if status == 200 and payload.get("value"):
        return payload["value"][0]["roleid"]
    return None


def create_role(name, bu_id):
    body = {"name": name, "businessunitid@odata.bind": f"businessunits({bu_id})"}
    status, payload, resp = api("POST", "/roles", body, solution=True)
    if status in (200, 204):
        # roleid from OData-EntityId header
        loc = resp.get("OData-EntityId") if resp else None
        if loc and "roles(" in loc:
            return loc.split("roles(")[1].rstrip(")")
        return get_role_id(name)
    raise RuntimeError(f"create role '{name}' failed: {status} {payload}")


def add_privileges(role_id, role_name, table_map, privs):
    rps = []
    missing = []
    for table, access_map in table_map.items():
        for access, depth in access_map.items():
            pname = f"prv{access}{table}".lower()
            pid = privs.get(pname)
            if not pid:
                missing.append(pname)
                continue
            rps.append({"Depth": depth, "PrivilegeId": pid})
    if missing:
        print(f"    ! missing privileges (skipped): {missing}")
    status, payload, _ = api(
        "POST",
        f"/roles({role_id})/Microsoft.Dynamics.CRM.AddPrivilegesRole",
        {"Privileges": rps},
    )
    if status in (200, 204):
        print(f"    + applied {len(rps)} privileges")
    else:
        print(f"    ! AddPrivilegesRole failed: {status} {payload}")


def main():
    bu_id = whoami_bu()
    print(f"Root/caller business unit: {bu_id}")
    privs = load_privileges([DOC, DTYPE, RSET, SUR])
    print(f"Loaded {len(privs)} custom-table privileges\n")

    for name, table_map in ROLES.items():
        existing = get_role_id(name)
        if existing:
            print(f"= exists  role '{name}' ({existing}) — re-applying privileges")
            role_id = existing
        else:
            role_id = create_role(name, bu_id)
            print(f"+ created role '{name}' ({role_id})")
        add_privileges(role_id, name, table_map, privs)

    print("\nSecurity roles complete.")


if __name__ == "__main__":
    main()
