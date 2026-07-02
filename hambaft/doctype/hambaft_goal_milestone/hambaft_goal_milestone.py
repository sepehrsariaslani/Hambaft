# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class HambaftGoalMilestone(Document):
    def validate(self):
        if not self.milestone_title:
            frappe.throw(_("عنوان مرحله الزامی است"))
