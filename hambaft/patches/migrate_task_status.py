"""
Migration: Normalize old Persian task statuses to English equivalents.

Run on the Frappe server:
    bench --site <site_name> execute hambaft.patches.migrate_task_status.execute

This patches all Task records that still have Persian status values
(e.g. "انجام‌شده") and converts them to the canonical English values
that the backend now expects.

Normalisation map:
    انجام‌شده  → done
    در_حال_انجام → in_progress
    انجام‌نشده → inbox
    لغو‌شده   → dropped
"""

import frappe

_STATUS_MAP = {
    "انجام‌شده": "done",
    "انجام شده": "done",
    "در حال انجام": "in_progress",
    "در_حال_انجام": "in_progress",
    "انجام‌نشده": "inbox",
    "انجام نشده": "inbox",
    "لغو‌شده": "dropped",
    "لغو شده": "dropped",
}

def execute():
    """Main entry point called by `bench execute`."""
    task_dt = "Task"
    if not frappe.db.exists("DocType", task_dt):
        print("Task DocType not found — skipping migration.")
        return

    updated = 0
    for old_status, new_status in _STATUS_MAP.items():
        names = frappe.get_all(task_dt, filters={"status": old_status}, pluck="name")
        for name in names:
            try:
                doc = frappe.get_doc(task_dt, name)
                doc.status = new_status
                doc.flags.ignore_mandatory = True
                doc.flags.ignore_validate = True
                doc.save(ignore_permissions=True)
                updated += 1
            except Exception as e:
                print(f"  ⚠ Failed to migrate {name}: {e}")

    # Also fix Hambaft Task child table (istable=1)
    ht_dt = "Hambaft Task"
    if frappe.db.exists("DocType", ht_dt):
        ht_map = {
            "انجام‌شده": "انجام‌شده",  # child table keeps Persian, just ensure consistency
            "انجام شده": "انجام‌شده",
        }
        for old_s, new_s in ht_map.items():
            if old_s == new_s:
                continue
            names = frappe.get_all(ht_dt, filters={"status": old_s}, pluck="name")
            for name in names:
                try:
                    frappe.db.set_value(ht_dt, name, "status", new_s)
                    updated += 1
                except Exception as e:
                    print(f"  ⚠ Failed to migrate HT {name}: {e}")

    frappe.db.commit()
    print(f"✅ Migrated {updated} task status record(s).")
