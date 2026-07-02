import frappe
print(dir(frappe)[:20])
print("version:", getattr(frappe, '__version__', 'unknown'))
