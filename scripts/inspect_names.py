import os, sys, json, urllib.request, urllib.error
sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import get_plugin_headers, get_token, load_env
load_env()
BASE = os.environ["DATAVERSE_URL"].rstrip("/") + "/api/data/v9.2"
def h():
    x = get_plugin_headers("dv-metadata", get_token()); x["Accept"]="application/json"; x["OData-Version"]="4.0"; x["OData-MaxVersion"]="4.0"; return x
def get(p):
    r = urllib.request.Request(BASE+p, headers=h())
    try:
        with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e: return {"_err": e.code, "_body": e.read().decode()[:200]}
# option set metadata ids
print("OPTION SETS:")
for n in ["msfthitl_processingstatus","msfthitl_reviewstatus","msfthitl_skillupdatestatus"]:
    d = get(f"/GlobalOptionSetDefinitions(Name='{n}')?$select=MetadataId,Name")
    print("  ", n, "->", d.get("MetadataId", d))
# table logical names + entity set names
print("TABLES:")
all_def = get("/EntityDefinitions?$select=LogicalName,EntitySetName,SchemaName&$filter=startswith(LogicalName,'msfthitl_')")
# startswith may 400; fallback
if "_err" in all_def:
    for cand in ["msfthitl_document","msfthitl_documenttype","msfthitl_reviewsetting","msfthitl_reviewsettings","msfthitl_skillupdaterequest"]:
        d = get(f"/EntityDefinitions(LogicalName='{cand}')?$select=LogicalName,EntitySetName,SchemaName")
        if "_err" not in d: print("  ", d["SchemaName"], "| logical:", d["LogicalName"], "| set:", d["EntitySetName"])
else:
    for e in all_def.get("value", []):
        print("  ", e["SchemaName"], "| logical:", e["LogicalName"], "| set:", e["EntitySetName"])
