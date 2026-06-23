app_name = "hambaft"
app_title = "Hambaft"
app_publisher = "Sepehr"
app_description = "Hambaft Frappe-Vue application"
app_email = "sepehr.sariaslani@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "hambaft",
# 		"logo": "/assets/hambaft/images/icon.png",
# 		"title": "Hambaft",
# 		"route": "/hambaft",
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/hambaft/css/hambaft.css"
# app_include_js = "/assets/hambaft/js/hambaft.js"

# include js, css files in header of web template
# web_include_css = "/assets/hambaft/css/hambaft.css"
# web_include_js = "/assets/hambaft/js/hambaft.js"

# include js in page
# page_js = { "page" : "public/js/file.js" }

# include js in doctype views
# doctype_js = { "doctype" : "public/js/doctype.js" }
# doctype_list_js = { "doctype" : "public/js/doctype_list.js" }
# doctype_tree_js = { "doctype" : "public/js/doctype_tree.js" }
# doctype_calendar_js = { "doctype" : "public/js/doctype_calendar.js" }

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "hambaft/public/icons.svg"

# Home Pages
# ------------------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# page_rewrite = {
# 	"doctype": "DocType",
# 	"html": "templates/pages/doctype.html"
# }

# Jinja Environment
# -----------------
# jinja = {
# 	"methods": "hambaft.utils.jinja_methods",
# 	"filters": "hambaft.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "hambaft.install.before_install"
# after_install = "hambaft.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "hambaft.uninstall.before_uninstall"
# after_uninstall = "hambaft.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "hambaft.utils.before_app_install"
# after_app_install = "hambaft.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "hambaft.utils.before_app_uninstall"
# after_app_uninstall = "hambaft.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "hambaft.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }

# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.utils.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"hambaft.tasks.all"
# 	],
# 	"daily": [
# 		"hambaft.tasks.daily"
# 	],
# 	"hourly": [
# 		"hambaft.tasks.hourly"
# 	],
# 	"weekly": [
# 		"hambaft.tasks.weekly"
# 	],
# 	"monthly": [
# 		"hambaft.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "hambaft.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "hambaft.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the public method,
# along with any special methods/settings that were applied for that override
# data = {
# 	"method": "frappe.desk.doctype.event.event.get_events",
# 	"class": "hambaft.event.get_events",
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["hambaft.utils.before_request"]
# after_request = ["hambaft.utils.after_request"]

# Job Events
# ----------
# before_job = ["hambaft.utils.before_job"]
# after_job = ["hambaft.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_4}",
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"hambaft.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }
