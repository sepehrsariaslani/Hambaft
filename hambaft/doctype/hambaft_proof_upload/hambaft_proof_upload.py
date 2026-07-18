# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class HambaftProofUpload(Document):
    def validate(self):
        if self.media_type in ("photo", "video") and not self.file_url:
            frappe.throw("File URL is required for photo or video proof.")
        if self.media_type == "text" and not self.reflection:
            frappe.throw("Reflection text is required for text proof.")
