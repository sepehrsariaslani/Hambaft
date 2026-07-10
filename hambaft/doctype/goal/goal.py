# Copyright (c) 2026, Hambaft and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import today, getdate, flt, cint


class Goal(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user

    def validate(self):
        if not self.title:
            frappe.throw(_("Title is required"))
        if not self.user:
            self.user = frappe.session.user
        if self.target_value and self.target_value <= 0:
            frappe.throw(_("Target value must be greater than 0"))
        if self.start_date and self.target_date and self.target_date < self.start_date:
            frappe.throw(_("Target date cannot be before start date"))
        # Prevent self-referencing parent
        if self.parent_goal and self.parent_goal == self.name:
            frappe.throw(_("Goal cannot be its own parent"))

    def on_update(self):
        if self.status == "تکمیل‌شده" and not self.progress_percent:
            self.progress_percent = 100

    # ─── Progress Computation ─────────────────────────────────

    def compute_progress(self):
        """Compute progress based on progress_mode and return (percent, detail_dict)."""
        mode = self.progress_mode or "دستی"
        try:
            if mode == "دستی":
                return self._progress_manual()
            elif mode == "مقدار_سنجه":
                return self._progress_metric()
            elif mode == "تجمیع_عادت":
                return self._progress_habit_rollup()
            elif mode == "تجمیع_پروژه":
                return self._progress_project_rollup()
            elif mode == "موجودی_مالی":
                return self._progress_finance_balance()
            elif mode == "پس‌انداز_مالی":
                return self._progress_finance_savings()
            elif mode == "پرداخت_بدهی":
                return self._progress_debt_paydown()
            elif mode == "مرکب_وزنی":
                return self._progress_weighted_composite()
            else:
                return self._progress_manual()
        except Exception as e:
            frappe.log_error(f"Goal progress computation error: {e}")
            return self.progress_percent or 0, {"error": str(e)}

    def _progress_manual(self):
        if self.target_value and self.target_value > 0 and self.current_value:
            pct = min(100, (flt(self.current_value) / flt(self.target_value)) * 100)
        else:
            pct = self.progress_percent or 0
        return pct, {"mode": "manual", "current": self.current_value, "target": self.target_value}

    def _progress_metric(self):
        if not self.target_value or self.target_value <= 0:
            return 0, {"mode": "metric", "error": "no_target"}
        pct = min(100, (flt(self.current_value or 0) / flt(self.target_value)) * 100)
        return pct, {"mode": "metric", "current": flt(self.current_value or 0), "target": flt(self.target_value)}

    def _progress_habit_rollup(self):
        """Rollup from linked habits using Goal Habit Link contribution logic."""
        links = self.get("linked_habits") or []
        if not links:
            return 0, {"mode": "habit_rollup", "error": "no_habits_linked"}

        detail = {"mode": "habit_rollup", "habits": []}
        total_weighted = 0
        total_weight = 0

        for link in links:
            if not link.habit:
                continue
            contribution = self._compute_habit_contribution(link)
            weight = flt(link.weight or 100)
            total_weighted += contribution * weight
            total_weight += weight
            detail["habits"].append({
                "habit": link.habit,
                "contribution_type": link.contribution_type,
                "contribution_pct": contribution,
                "weight": weight,
            })

        if total_weight <= 0:
            return 0, detail

        pct = min(100, total_weighted / total_weight)
        return pct, detail

    def _compute_habit_contribution(self, link):
        """Compute a single habit's contribution (0-100%) toward this goal."""
        habit_name = link.habit
        contrib_type = link.contribution_type or "تعداد_انجام"
        period = link.period or "ماهانه"
        target = flt(link.target_value or 1)
        cap = flt(link.cap_value or 0)
        is_negative = cint(link.is_negative)

        # Determine date range based on period
        today_str = today()
        from_date = self._period_start(period, today_str)
        to_date = today_str

        # Fetch logs — try both Habit Log (old) and Hambaft Habit Log (new)
        logs = self._get_habit_logs(habit_name, from_date, to_date)

        if contrib_type == "تعداد_انجام":
            value = len(logs)
        elif contrib_type == "نرخ_انجام":
            if not from_date:
                value = 1.0 if logs else 0.0
            else:
                days = max(1, (getdate(to_date) - getdate(from_date)).days + 1)
                value = len(logs) / days
        elif contrib_type == "رکورد":
            value = self._compute_streak(habit_name)
        elif contrib_type == "مجموع_مقدار":
            value = sum(flt(log.get("value") or 0) for log in logs)
        elif contrib_type == "میانگین_مقدار":
            value = sum(flt(log.get("value") or 0) for log in logs) / max(len(logs), 1)
        elif contrib_type == "بله_خیر":
            value = 1.0 if logs else 0.0
        else:
            value = len(logs)

        if cap and cap > 0:
            value = min(value, cap)

        contribution = min(1.0, value / max(target, 0.001)) * 100

        if is_negative:
            contribution = max(0, 100 - contribution)

        return contribution

    def _get_habit_logs(self, habit_name, from_date, to_date):
        """Fetch habit logs from both log types."""
        logs = []
        # Try Habit Log (old, links to Habit doctype)
        try:
            filters = {"habit": habit_name, "status": ["in", ["انجام‌شده", "done"]]}
            if from_date:
                filters["date"] = [">=", from_date]
            if to_date:
                if "date" in filters:
                    filters["date"] = ["between", [from_date, to_date]]
                else:
                    filters["date"] = ["<=", to_date]
            logs = frappe.get_all("Habit Log", filters=filters, fields=["name", "value", "date"])
        except Exception:
            pass

        if not logs:
            # Try Hambaft Habit Log (new, links to Hambaft Habit doctype)
            try:
                filters = {"habit": habit_name, "status": ["in", ["انجام‌شده", "done"]]}
                if from_date:
                    filters["log_date"] = [">=", from_date]
                if to_date:
                    if "log_date" in filters:
                        filters["log_date"] = ["between", [from_date, to_date]]
                    else:
                        filters["log_date"] = ["<=", to_date]
                logs = frappe.get_all("Hambaft Habit Log", filters=filters, fields=["name", "value", "log_date as date"])
            except Exception:
                pass

        return logs

    def _compute_streak(self, habit_name):
        """Simple current streak computation."""
        try:
            logs = frappe.get_all(
                "Habit Log",
                filters={"habit": habit_name, "status": ["in", ["انجام‌شده", "done"]]},
                fields=["date"],
                order_by="date desc",
                limit=60,
            )
            if not logs:
                return 0
            streak = 0
            prev = None
            for log in logs:
                d = getdate(log.date)
                if prev is None:
                    prev = d
                    streak = 1
                elif (prev - d).days == 1:
                    streak += 1
                    prev = d
                else:
                    break
            return streak
        except Exception:
            return 0

    def _period_start(self, period, ref_date_str):
        """Return the start date for the given period."""
        ref = getdate(ref_date_str)
        if period == "روزانه":
            return ref_date_str
        elif period == "هفتگی":
            # Start of week (Saturday in Iran)
            weekday = ref.weekday()
            offset = (weekday - 5) % 7  # Saturday = 0
            from datetime import timedelta
            start = ref - timedelta(days=offset)
            return start.isoformat()
        elif period == "ماهانه":
            return ref.replace(day=1).isoformat()
        elif period == "کل":
            return None
        return ref.replace(day=1).isoformat()

    def _progress_project_rollup(self):
        """Progress derived from linked projects."""
        projects = frappe.get_all(
            "Hambaft Project",
            filters={"goal": self.name, "user": self.user},
            fields=["name", "title", "progress", "status"],
        )
        if not projects:
            return 0, {"mode": "project_rollup", "error": "no_projects"}

        total_progress = sum(flt(p.progress or 0) for p in projects)
        pct = min(100, total_progress / len(projects))
        detail = {
            "mode": "project_rollup",
            "projects": [{"name": p.name, "title": p.title, "progress": p.progress} for p in projects],
        }
        return pct, detail

    def _progress_finance_balance(self):
        """Progress from linked finance account balances."""
        links = self.get("linked_finance_accounts") or []
        if not links:
            return 0, {"mode": "finance_balance", "error": "no_accounts"}

        total_current = 0
        total_target = 0
        for link in links:
            if not link.finance_account:
                continue
            balance = flt(frappe.db.get_value("Hambaft Finance Account", link.finance_account, "current_balance") or 0)
            target = flt(link.target_amount or self.target_value or 0)
            total_current += balance
            total_target += target

        if total_target <= 0:
            return 0, {"mode": "finance_balance", "current": total_current, "target": total_target}

        pct = min(100, (total_current / total_target) * 100)
        return pct, {"mode": "finance_balance", "current": total_current, "target": total_target}

    def _progress_finance_savings(self):
        """Progress from savings: current_balance - initial_amount vs target."""
        links = self.get("linked_finance_accounts") or []
        if not links:
            return 0, {"mode": "finance_savings", "error": "no_accounts"}

        total_saved = 0
        total_target = 0
        for link in links:
            if not link.finance_account:
                continue
            balance = flt(frappe.db.get_value("Hambaft Finance Account", link.finance_account, "current_balance") or 0)
            initial = flt(link.initial_amount or 0)
            saved = max(0, balance - initial)
            target = flt(link.target_amount or self.target_value or 0)
            total_saved += saved
            total_target += target

        if total_target <= 0:
            return 0, {"mode": "finance_savings", "saved": total_saved, "target": total_target}

        pct = min(100, (total_saved / total_target) * 100)
        return pct, {"mode": "finance_savings", "saved": total_saved, "target": total_target}

    def _progress_debt_paydown(self):
        """Progress from debt payoff: initial - current_balance vs initial."""
        links = self.get("linked_finance_accounts") or []
        if not links:
            return 0, {"mode": "debt_paydown", "error": "no_accounts"}

        total_paid = 0
        total_initial = 0
        for link in links:
            if not link.finance_account:
                continue
            balance = flt(frappe.db.get_value("Hambaft Finance Account", link.finance_account, "current_balance") or 0)
            initial = flt(link.initial_amount or 0)
            paid = max(0, initial - balance)
            total_paid += paid
            total_initial += initial

        if total_initial <= 0:
            return 0, {"mode": "debt_paydown", "paid": total_paid, "initial": total_initial}

        pct = min(100, (total_paid / total_initial) * 100)
        return pct, {"mode": "debt_paydown", "paid": total_paid, "initial": total_initial}

    def _progress_weighted_composite(self):
        """Weighted composite: average habit + project + finance contributions."""
        components = []
        # Habits
        habit_links = self.get("linked_habits") or []
        if habit_links:
            habit_pct, _ = self._progress_habit_rollup()
            components.append(("habits", habit_pct, 1.0))

        # Projects
        projects = frappe.get_all(
            "Hambaft Project",
            filters={"goal": self.name, "user": self.user},
            fields=["name", "progress"],
        )
        if projects:
            proj_pct = sum(flt(p.progress or 0) for p in projects) / len(projects)
            components.append(("projects", proj_pct, 1.0))

        # Finance
        fin_links = self.get("linked_finance_accounts") or []
        if fin_links:
            fin_pct, _ = self._progress_finance_balance()
            components.append(("finance", fin_pct, 1.0))

        # Manual metric
        if self.target_value and self.target_value > 0:
            manual_pct = min(100, (flt(self.current_value or 0) / flt(self.target_value)) * 100)
            components.append(("metric", manual_pct, 1.0))

        if not components:
            return self.progress_percent or 0, {"mode": "weighted_composite", "error": "no_components"}

        total_weighted = sum(pct * w for _, pct, w in components)
        total_weight = sum(w for _, _, w in components)
        pct = min(100, total_weighted / max(total_weight, 0.001))

        return pct, {
            "mode": "weighted_composite",
            "components": {name: pct for name, pct, _ in components},
        }


def has_permission(doc, ptype="read", user=None):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    if doc and hasattr(doc, "user") and doc.user == user:
        return True
    return False
