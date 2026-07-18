# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe.model.document import Document

class HambaftGalleryBoard(Document):
    def on_trash(self):
        # Delete all sections and pins when board is deleted
        for section in frappe.get_all("Hambaft Gallery Section", filters={"board": self.name}, pluck="name"):
            frappe.delete_doc("Hambaft Gallery Section", section, force=True)
        for pin in frappe.get_all("Hambaft Gallery Pin", filters={"board": self.name}, pluck="name"):
            frappe.delete_doc("Hambaft Gallery Pin", pin, force=True)
