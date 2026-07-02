import sys, os
sys.path.insert(0, "/home/frappe/frappe-bench/apps")
os.chdir("/home/frappe/frappe-bench")
import frappe
import unittest

site = "hambaft.ir"
sites_path = "/home/frappe/frappe-bench/sites"
frappe.init(site=site, sites_path=sites_path)
frappe.connect()
frappe.flags.in_test = True

# Load test file
sys.path.insert(0, "/home/frappe/frappe-bench/apps/hambaft/hambaft/tests")

from test_hambaft_recurrence_rule import TestHambaftRecurrenceRule

# Run tests
loader = unittest.TestLoader()
suite = loader.loadTestsFromTestCase(TestHambaftRecurrenceRule)
runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)

frappe.destroy()
sys.exit(0 if result.wasSuccessful() else 1)
