import frappe
import json

habit = frappe.get_doc("DocType", "Hambaft Habit")
print("=== Hambaft Habit ===")
print("Total fields:", len(habit.fields))
print("istable:", habit.istable)
print("issingle:", habit.issingle)
for f in habit.fields:
    print(f"  {f.fieldname} | {f.fieldtype} | {f.label} | reqd={f.reqd} | default={f.default}")

print()
print("=== Hambaft Habit Schedule ===")
schedule = frappe.get_doc("DocType", "Hambaft Habit Schedule")
print("Total fields:", len(schedule.fields))
print("istable:", schedule.istable)
for f in schedule.fields:
    print(f"  {f.fieldname} | {f.fieldtype} | {f.label}")

print()
print("=== Permissions (Habit) ===")
for p in habit.permissions:
    print(f"  role={p.role} read={p.read} write={p.write} create={p.create} delete={p.delete} if_owner={getattr(p,'if_owner',False)}")
