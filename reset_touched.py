import json
# Reset touched_tables to force re-migration
path = '/home/frappe/frappe-bench/sites/hambaft.ir/touched_tables.json'
with open(path, 'w') as f:
    json.dump([], f)
print('touched_tables.json reset')
