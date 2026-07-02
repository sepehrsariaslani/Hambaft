import frappe
d = frappe.get_all("DocType", filters={"name": "Hambaft Decision Log"}, fields=["name", "module", "autoname", "custom"])
if d:
    print("FOUND:", d[0])
    # Check fields
    meta = frappe.get_meta("Hambaft Decision Log")
    field_names = [f.fieldname for f in meta.fields]
    print("FIELDS:", field_names)
else:
    print("NOT FOUND")
