import frappe
import traceback


def run():
    from frappe.modules.utils import get_doctype_module, get_module_name
    for dt in ['Note', 'Task']:
        try:
            module = get_doctype_module(dt)
            print(f'{dt}: get_doctype_module -> {module!r}')
            from frappe.model.base_document import get_controller
            # Try the actual import path Frappe builds
            from frappe.modules import load_doctype_module
            try:
                m = load_doctype_module(dt)
                print(f'  load_doctype_module OK -> {m.__name__}')
                classname = dt.replace(' ', '')
                print(f'  has class {classname}: {hasattr(m, classname)}')
            except Exception as e:
                print(f'  load_doctype_module FAIL: {type(e).__name__}: {e}')
                print(traceback.format_exc()[-800:])
        except Exception as e:
            print(f'{dt}: ERR {type(e).__name__}: {e}')
