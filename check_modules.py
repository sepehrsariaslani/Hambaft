import os, sys
sys.path.insert(0, '/home/frappe/frappe-bench/apps')

import frappe
frappe.init(site='hambaft.ir', sites_path='/home/frappe/frappe-bench/sites')
frappe.connect()

# Check what doctypes are known
all_meta = frappe.get_all("DocType", fields=["name", "module"])
hambaft_meta = [d for d in all_meta if 'hambaft' in d.get('module', '').lower() or 'hambaft' in d.get('name', '').lower()]
print(f"Total DocTypes in DB: {len(all_meta)}")
print(f"Hambaft-related DocTypes: {len(hambaft_meta)}")
for d in hambaft_meta:
    print(f"  {d['name']} (module: {d.get('module', 'N/A')})")

# Check modules
print("\nAll modules:")
modules = set(d.get('module', 'N/A') for d in all_meta)
for m in sorted(modules):
    if 'hambaft' in m.lower():
        print(f"  {m}")

# Try to list all apps and their modules
print("\nApp modules:")
from frappe.modules.utils import get_modules
app_modules = get_modules('hambaft')
print(f"hambaft modules: {app_modules}")

frappe.destroy()
