import frappe, importlib


def run():
    events = frappe.get_hooks('doc_events', app_name='hambaft')
    for dt, handlers in events.items():
        for event, paths in handlers.items():
            for path in paths:
                mod_path, _, fn = path.rpartition('.')
                try:
                    m = importlib.import_module(mod_path)
                except Exception as e:
                    print(f"{dt} | {event} | {path} | IMPORT_ERR {type(e).__name__}: {e}")
                    continue
                has_mod_fn = hasattr(m, fn)
                classes = [v for v in vars(m).values()
                           if isinstance(v, type) and hasattr(v, fn)
                           and getattr(v, '__module__', '') == m.__name__]
                cls_has = bool(classes)
                flag = 'OK-modfn' if has_mod_fn else ('CLASS-METHOD-ONLY' if cls_has else 'MISSING')
                if flag != 'OK-modfn':
                    print(f"{dt} | {event} | {path} | {flag}")
    print('DONE')
