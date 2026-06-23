from __future__ import unicode_literals

import frappe


@frappe.whitelist()
def ping():
    """Simple ping endpoint to verify Frappe-Vue communication."""
    return {"status": "ok", "message": "Hambaft is alive!"}


@frappe.whitelist()
def get_app_info():
    """Return basic app information."""
    return {
        "app_name": "hambaft",
        "version": frappe.get_attr("hambaft.__version__") or "0.0.1",
        "description": "Hambaft Frappe-Vue application",
    }
