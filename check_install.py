import os, sys
sys.path.insert(0, '/home/frappe/frappe-bench/apps')

import frappe
frappe.init(site='hambaft.ir', sites_path='/home/frappe/frappe-bench/sites')
apps = frappe.get_installed_apps()
print("APPS:", apps)
frappe.destroy()
