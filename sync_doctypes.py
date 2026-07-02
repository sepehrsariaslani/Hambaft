import os, sys
sys.path.insert(0, '/home/frappe/frappe-bench/apps')

import frappe
frappe.init(site='hambaft.ir', sites_path='/home/frappe/frappe-bench/sites')
frappe.connect()

# Find all doctype JSON files
doctype_dirs = [
    '/home/frappe/frappe-bench/apps/hambaft/hambaft/doctype',
    '/home/frappe/frappe-bench/apps/hambaft/hambaft/hambaft_core/doctype',
    '/home/frappe/frappe-bench/apps/hambaft/hambaft/hambaft_ai/doctype',
]

all_doctypes = []
for ddir in doctype_dirs:
    for name in sorted(os.listdir(ddir)):
        d = os.path.join(ddir, name)
        if os.path.isdir(d) and not name.startswith('__'):
            json_file = os.path.join(d, f'{name}.json')
            if os.path.exists(json_file):
                all_doctypes.append(name)

print(f"Found {len(all_doctypes)} doctypes")

# Sync each doctype
print("\nSyncing doctypes...")
success = 0
failed = 0
for dt in all_doctypes:
    try:
        meta = frappe.get_meta(dt, cached=False)
        meta.sync()
        print(f"  OK: {dt}")
        success += 1
    except Exception as e:
        print(f"  FAIL: {dt} - {e}")
        failed += 1

print(f"\nDone! Success: {success}, Failed: {failed}")

# Verify tables exist
db = frappe.db
cursor = db.sql("SHOW TABLES LIKE 'tabHambaft%'")
tables = cursor.fetchall()
print(f"\nHambaft tables in DB: {len(tables)}")
for t in tables:
    print(f"  {t[0]}")

frappe.destroy()
