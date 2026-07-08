import frappe


def run():
    from frappe.model.base_document import get_controller
    for dt in ['Note', 'Task', 'Goal']:
        try:
            cls = get_controller(dt)
            has_v = 'validate' in cls.__dict__ or any('validate' in c.__dict__ for c in cls.__mro__)
            print(f'{dt}: controller={cls.__module__}.{cls.__name__}  has_validate={hasattr(cls, "validate")}  own_validate={"validate" in cls.__dict__}')
        except Exception as e:
            print(f'{dt}: ERR {type(e).__name__}: {e}')

    # Does the meta think user is mandatory and what's its default?
    for dt in ['Note', 'Task']:
        meta = frappe.get_meta(dt)
        uf = meta.get_field('user')
        print(f'{dt}.user field: reqd={getattr(uf,"reqd",None)} default={getattr(uf,"default",None)} fieldtype={getattr(uf,"fieldtype",None)}')
