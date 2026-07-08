import json
import os
import glob

BASE = '/home/frappe/frappe-bench/apps/hambaft/hambaft'


def run():
    dt_files = glob.glob(os.path.join(BASE, '**', 'doctype', '*', '*.json'), recursive=True)

    meta = {}          # doctype name -> (istable, path)
    referenced = set()  # doctype names used as a Table/Table MultiSelect field option

    for path in dt_files:
        try:
            d = json.load(open(path))
        except Exception:
            continue
        if d.get('doctype') != 'DocType' and 'fields' not in d and 'name' not in d:
            continue
        name = d.get('name')
        if not name:
            continue
        meta[name] = (d.get('istable', 0), path)
        for f in d.get('fields', []) or []:
            if f.get('fieldtype') in ('Table', 'Table MultiSelect') and f.get('options'):
                referenced.add(f['options'])

    wrong = []   # istable=1 but never referenced as a child table -> should be 0
    real_child = []
    for name, (istable, path) in sorted(meta.items()):
        if istable:
            if name in referenced:
                real_child.append(name)
            else:
                wrong.append((name, path))

    print('=== WRONGLY istable=1 (top-level, must become 0) ===')
    for name, path in wrong:
        print(f'{name}  ::  {path.replace(BASE, "")}')
    print()
    print('=== LEGIT child tables (referenced as Table field) ===')
    for name in real_child:
        print(name)
    print('DONE', len(wrong), 'to-fix')
