# -*- coding: utf-8 -*-
"""Authentication hooks and whitelisted API endpoints for Hambaft."""

from __future__ import unicode_literals

import frappe
from frappe import _


# ---------------------------------------------------------------------------
# Session lifecycle hooks
# ---------------------------------------------------------------------------

def on_session_creation():
    """Called after a Frappe session is created (user logged in).

    Finds or creates a 'Hambaft Profile' DocType record tied to the
    current Frappe User so the frontend /profile page has data.
    """
    # Only run for hambaft.ir site
    if frappe.local.site and "hambaft" not in frappe.local.site:
        return
    
    user = frappe.session.user
    if user in ("Guest", "Administrator"):
        return

    try:
        _ensure_hambaft_profile(user)
    except Exception:
        pass  # dont block login if profile fails


def on_logout():
    """Called when the user logs out via Frappe's standard logout."""
    # Only run for hambaft.ir site
    if frappe.local.site and "hambaft" not in frappe.local.site:
        return
    frappe.local.flags.redirect_location = "/login"
    raise frappe.Redirect


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_hambaft_profile(user):
    """Return the name of the Hambaft Profile for *user*, creating one if missing."""
    profile_name = frappe.db.exists("Hambaft Profile", {"user": user})
    if profile_name:
        return profile_name

    # Create profile — signup_date is set to now
    profile = frappe.get_doc({
        "doctype": "Hambaft Profile",
        "user": user,
        "signup_date": frappe.utils.now_datetime(),
    })
    profile.insert(ignore_permissions=True)
    frappe.db.commit()  # ensure it is visible to subsequent queries this request
    return profile.name


# ---------------------------------------------------------------------------
# Whitelisted API endpoints
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_profile():
    """Return the current user's profile information.

    Returns:
        dict with keys: name (user id), full_name, email, signup_date
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)

    # Fetch Frappe User record for name/email
    user_doc = frappe.get_doc("User", user)
    signup_date = None

    # Try to find linked Hambaft Profile for signup_date
    profile_name = frappe.db.get_value("Hambaft Profile", {"user": user}, "name")
    if profile_name:
        profile = frappe.get_doc("Hambaft Profile", profile_name)
        signup_date = str(profile.signup_date) if profile.signup_date else None
    else:
        # Auto-create if missing (shouldn't happen on_session_creation, but be safe)
        profile_name = _ensure_hambaft_profile(user)
        profile = frappe.get_doc("Hambaft Profile", profile_name)
        signup_date = str(profile.signup_date) if profile.signup_date else None

    return {
        "name": user_doc.name,
        "full_name": user_doc.full_name,
        "email": user_doc.email,
        "signup_date": signup_date,
    }


@frappe.whitelist()
def get_logout_url():
    """Return the Frappe logout URL so the frontend can redirect."""
    return {"url": "/?cmd=web_logout"}


@frappe.whitelist(allow_guest=True)
def logout_user():
    """Standard Frappe logout — clears the session and redirects."""
    frappe.local.flags.redirect_location = "/login"
    frappe.session.user = "Guest"
    frappe.db.commit()
    return {"status": "ok"}
