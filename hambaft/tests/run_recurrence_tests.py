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

app_tests = "/home/frappe/frappe-bench/apps/hambaft/hambaft/tests"
if app_tests not in sys.path:
    sys.path.insert(0, app_tests)

from test_recurrence_engine import (
    TestParseDaysOfWeek,
    TestGetNextMonthDay,
    TestDailyRecurrence,
    TestWeeklyRecurrence,
    TestMonthlyRecurrence,
    TestYearlyRecurrence,
    TestCustomRecurrence,
    TestEdgeCases,
    TestJalaliOutput,
    TestCreateNextReminder,
    TestMarkReminderSentAndCreateNext,
)

loader = unittest.TestLoader()
suite = unittest.TestSuite()
for tc in [
    TestParseDaysOfWeek,
    TestGetNextMonthDay,
    TestDailyRecurrence,
    TestWeeklyRecurrence,
    TestMonthlyRecurrence,
    TestYearlyRecurrence,
    TestCustomRecurrence,
    TestEdgeCases,
    TestJalaliOutput,
    TestCreateNextReminder,
    TestMarkReminderSentAndCreateNext,
]:
    suite.addTests(loader.loadTestsFromTestCase(tc))

runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)

frappe.destroy()
sys.exit(0 if result.wasSuccessful() else 1)
