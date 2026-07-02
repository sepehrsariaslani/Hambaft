import os, sys
os.chdir('/home/frappe/frappe-bench')
sys.path.insert(0, '/home/frappe/frappe-bench/apps')

import frappe
frappe.init(site='hambaft.ir')
print("Apps:", frappe.get_installed_apps())
frappe.destroy()
