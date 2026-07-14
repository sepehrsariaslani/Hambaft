# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe.model.document import Document

class HambaftGallerySection(Document):
    def on_trash(self):
        # Delete all pins in this section when section is deleted
        for pin in frappe.get_all("Hambaft Gallery Pin", filters={"section": self.name}, pluck="name"):
            frappe.delete_doc("Hambaft Gallery Pin", pin, force=True)
