import frappe
import traceback


def run():
    from frappe.model.base_document import get_controller, import_controller
    from frappe.model.document import Document

    for dt in ['Note', 'Task', 'Goal']:
        try:
            c = import_controller(dt)
            print(f'{dt}: import_controller -> {c.__module__}.{c.__name__}')
        except Exception:
            print(f'{dt}: import_controller raised:')
            print(traceback.format_exc()[-1000:])

    # Manually replicate the lookup to catch the swallow
    from frappe.modules import load_doctype_module
    for dt in ['Note']:
        module_name = frappe.db.get_value('DocType', dt, 'module')
        m = load_doctype_module(dt, module_name)
        classname = dt.replace(' ', '').replace('-', '')
        cls = getattr(m, classname, None)
        print(f'{dt}: manual module={m.__name__} classname={classname} cls={cls} issub_Document={issubclass(cls, Document) if cls else None}')
