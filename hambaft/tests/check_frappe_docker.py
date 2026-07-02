import frappe
print("frappe file:", frappe.__file__)
print("frappe init:", hasattr(frappe, 'init'))
