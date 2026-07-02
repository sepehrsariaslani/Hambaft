import json, sys
path = '/home/frappe/frappe-bench/sites/apps.json'
with open(path) as f:
    data = json.load(f)
print("hambaft entry:", json.dumps(data.get('hambaft', 'NOT FOUND'), indent=2))
print()
print("All apps:", list(data.keys()))
