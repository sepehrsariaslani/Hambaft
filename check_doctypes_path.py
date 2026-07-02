from frappe.modules.utils import get_doctype_module_path
import frappe

# Try to find the Goal doctype module
try:
    path = get_doctype_module_path('Goal', 'hambaft')
    print(f"Module path for Goal: {path}")
except Exception as e:
    print(f"Error: {e}")

# List all doctype paths
import os
doctype_dir = '/home/frappe/frappe-bench/apps/hambaft/hambaft/doctype'
for name in sorted(os.listdir(doctype_dir)):
    d = os.path.join(doctype_dir, name)
    if os.path.isdir(d) and not name.startswith('__'):
        print(f"  Found doctype: {name}")
