import sys, os
sys.path.insert(0, "/home/frappe/frappe-bench/apps")
os.chdir("/home/frappe/frappe-bench")
import frappe
import inspect

# Check init source
source = inspect.getsource(frappe.init)
print(source[:2000])
