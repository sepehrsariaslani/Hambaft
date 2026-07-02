
import sys
sys.path.insert(0, "/home/frappe/frappe-bench/apps")
print("Python path:", sys.path[:5])
import frappe
print("frappe.__file__:", getattr(frappe, '__file__', 'NO FILE'))
print("Has init:", hasattr(frappe, 'init'))
print("Attrs:", [x for x in dir(frappe) if 'init' in x.lower() or 'site' in x.lower()])
