import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), "scripts"))
from auth import get_client
c = get_client("dv-metadata")
# publishers
pubs = [p for page in c.records.get("publisher",
        filter="customizationprefix ne 'none' and uniquename ne 'MicrosoftCorporation'",
        select=["uniquename","friendlyname","customizationprefix"], top=50) for p in page]
print("PUBLISHERS (prefix):")
for p in pubs:
    print("  ", p.get("customizationprefix"), "|", p.get("uniquename"), "|", p.get("friendlyname"))
# solutions
sols = [s for page in c.records.get("solution",
        select=["uniquename","friendlyname","ismanaged"], top=200) for s in page]
hit = [s for s in sols if s.get("uniquename")=="HITLSkillUpdate"]
print("SOLUTION HITLSkillUpdate:", hit if hit else "NOT FOUND")
# existing msfthitl_ tables
targets = ["msfthitl_document","msfthitl_documenttype","msfthitl_reviewsetting","msfthitl_skillupdaterequest"]
for t in targets:
    ex = c.tables.get(t)
    print(f"TABLE {t}:", "EXISTS" if ex else "absent")
