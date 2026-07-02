import sys
sys.path.insert(0, "/home/frappe/frappe-bench/apps")
import frappe
frappe.init(site="hambaft.ir", sites_path="/home/frappe/frappe-bench/sites")
frappe.connect()

doc = frappe.new_doc("Hambaft Task")
print("Hambaft Task class:", doc.__class__.__name__)

doc2 = frappe.new_doc("Hambaft Recurrence Rule")
print("Hambaft Recurrence Rule class:", doc2.__class__.__name__)

# Check if Hambaft Task is custom
is_custom = frappe.db.get_value("DocType", "Hambaft Task", "custom")
print("Hambaft Task is custom:", is_custom)

is_custom2 = frappe.db.get_value("DocType", "Hambaft Recurrence Rule", "custom")
print("Hambaft Recurrence Rule is custom:", is_custom2)

frappe.destroy()
