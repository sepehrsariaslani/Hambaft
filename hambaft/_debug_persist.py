import frappe, json, traceback


def run():
    frappe.set_user('Administrator')
    from hambaft.hambaft import api
    out = {}

    for label, fn in [
        ('create_task', lambda: api.create_task(json.dumps({'title': 'debug-test-task', 'status': 'open'}))),
        ('create_note', lambda: api.create_note(json.dumps({'title': 'dbg', 'content': 'x', 'date': '2026-07-06'}))),
    ]:
        try:
            r = fn()
            out[label] = ('OK', str(r)[:200])
        except Exception as e:
            out[label] = ('ERR:' + type(e).__name__, traceback.format_exc()[-1200:])

    for k, v in out.items():
        print('==== ' + k + ' ====')
        print(v[0])
        print(v[1])
    frappe.db.rollback()
