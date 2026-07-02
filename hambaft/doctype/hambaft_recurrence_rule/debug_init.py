import sys, os
sys.path.insert(0, "/home/frappe/frappe-bench/apps")
os.chdir("/home/frappe/frappe-bench")
import frappe

# Check what _get_site_config does
import inspect
from frappe.config import _get_site_config
print(inspect.getsource(_get_site_config))
