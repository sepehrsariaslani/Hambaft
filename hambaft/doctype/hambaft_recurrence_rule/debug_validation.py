import sys, os
sys.path.insert(0, "/home/frappe/frappe-bench/apps")
os.chdir("/home/frappe/frappe-bench")
import frappe

site = "hambaft.ir"
sites_path = "/home/frappe/frappe-bench/sites"
frappe.init(site=site, sites_path=sites_path)
frappe.connect()

import inspect
from frappe.model.base_document import import_controller
source = inspect.getsource(import_controller)
print(source[:3000])

frappe.destroy()
