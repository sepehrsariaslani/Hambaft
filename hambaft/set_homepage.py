from __future__ import unicode_literals
import frappe

def set_homepage():
    ws = frappe.get_doc('Website Settings')
    ws.home_page = '/hambaft'
    ws.save(ignore_permissions=True)
    frappe.db.commit()
    print(f"home_page set to: {ws.home_page}")
