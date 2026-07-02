from frappe import _
import frappe
apps = frappe.get_installed_apps()
print("Installed apps:", apps)
print()
hambaft = [a for a in apps if 'hambaft' in a.lower()]
print("Hambaft-related:", hambaft)
