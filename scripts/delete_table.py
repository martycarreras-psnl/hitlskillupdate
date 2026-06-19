import os, sys, urllib.request, urllib.error
sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import get_plugin_headers, get_token, load_env
load_env()
BASE = os.environ["DATAVERSE_URL"].rstrip("/") + "/api/data/v9.2"
target = sys.argv[1]
h = get_plugin_headers("dv-metadata", get_token())
h["OData-Version"]="4.0"; h["OData-MaxVersion"]="4.0"
r = urllib.request.Request(f"{BASE}/EntityDefinitions(LogicalName='{target}')", method="DELETE", headers=h)
try:
    with urllib.request.urlopen(r) as resp: print("DELETED", target, resp.status)
except urllib.error.HTTPError as e: print("ERR", e.code, e.read().decode()[:300])
