import sys, os
sys.path.insert(0, "/home/frappe/frappe-bench/apps")
os.chdir("/home/frappe/frappe-bench")
import frappe

site = "hambaft.ir"
sites_path = "/home/frappe/frappe-bench/sites"
frappe.init(site=site, sites_path=sites_path)
frappe.connect()
print("Connected to site:", site)
print("Syncing DocType...")

try:
    frappe.modules.utils.sync(doctype="Hambaft Recurrence Rule", force=True, reset_permissions=False)
    print("Sync done.")
except Exception as e:
    print(f"Sync error (non-fatal): {e}")

# Verify
if frappe.db.exists("DocType", "Hambaft Recurrence Rule"):
    dt = frappe.get_doc("DocType", "Hambaft Recurrence Rule")
    print(f"DocType verified: {dt.name}, module={dt.module}, fields={len(dt.fields)}")
    for f in dt.fields:
        print(f"  - {f.fieldname} ({f.fieldtype})")
else:
    print("WARNING: DocType not found in DB after sync")

frappe.db.commit()
frappe.destroy()
print("Complete.")
