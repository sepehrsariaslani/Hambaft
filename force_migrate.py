import frappe
frappe.init(site='hambaft.ir')
frappe.connect()

# Force migrate for hambaft app
from frappe.migrate import migrate
migrate()

print("Migration done")
frappe.destroy()
