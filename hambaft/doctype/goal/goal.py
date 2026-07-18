# Copyright (c) 2026, Hambaft and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import today, getdate, flt, cint, now_datetime


class Goal(Document):
    CONTRIBUTION_TYPE_MULTIPLIERS = {
        "اجباری": 1.0,
        "پیشنهادی": 0.7,
        "پشتیبان": 0.4,
    }

    def _ct_multiplier(self, contrib_type):
        """Return contribution_type multiplier: mandatory=1.0, recommended=0.7, supporting=0.4."""
        return self.CONTRIBUTION_TYPE_MULTIPLIERS.get(contrib_type or "اجباری", 1.0)

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

    # ─── Manual / Metric ────────────────────────────────────

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

    # ─── Habit Rollup (unchanged) ───────────────────────────

    def _progress_habit_rollup(self):
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
        habit_name = link.habit
        contrib_type = link.contribution_type or "تعداد_انجام"
        period = link.period or "ماهانه"
        target = flt(link.target_value or 1)
        cap = flt(link.cap_value or 0)
        is_negative = cint(link.is_negative)

        today_str = today()
        from_date = self._period_start(period, today_str)
        to_date = today_str

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
        logs = []
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
        ref = getdate(ref_date_str)
        if period == "روزانه":
            return ref_date_str
        elif period == "هفتگی":
            weekday = ref.weekday()
            offset = (weekday - 5) % 7
            from datetime import timedelta
            start = ref - timedelta(days=offset)
            return start.isoformat()
        elif period == "ماهانه":
            return ref.replace(day=1).isoformat()
        elif period == "کل":
            return None
        return ref.replace(day=1).isoformat()

    # ─── Hybrid Weighted Project Rollup ─────────────────────

    def _progress_project_rollup(self):
        """Hybrid weighted engine for project-driven goals.

        Combines 5 signals:
          1. project_progress  – raw % complete of each linked project
          2. milestone_signal  – % of milestone/key tasks done across projects
          3. key_task_signal   – % of key tasks done across projects
          4. tracked_time      – normalised actual/estimated ratio, capped
          5. metric_signal     – current_value/target_value if set

        Each signal has a configurable weight on the Goal doc.
        """
        # Collect linked projects — from Goal Project Link if present, else from project.goal
        project_links = self._get_project_links()
        if not project_links:
            return 0, {"mode": "project_rollup", "error": "no_projects"}

        # Weights with defaults
        w_progress = flt(self.project_progress_weight or 40)
        w_milestone = flt(self.milestone_weight or 25)
        w_key_task = flt(self.key_task_weight or 20)
        w_time = flt(self.tracked_time_weight or 10)
        w_metric = flt(self.metric_weight or 5)
        total_w = w_progress + w_milestone + w_key_task + w_time + w_metric

        # 1. Project progress signal (weighted by per-project weight)
        project_progress_pct, project_detail = self._signal_project_progress(project_links)

        # 2. Milestone signal
        milestone_pct, milestone_detail = self._signal_milestone(project_links)

        # 3. Key task signal
        key_task_pct, key_task_detail = self._signal_key_task(project_links)

        # 4. Tracked time signal (normalised, capped)
        time_pct, time_detail = self._signal_tracked_time(project_links)

        # 5. Metric signal
        metric_pct, metric_detail = self._signal_metric()

        # Weighted combination
        if total_w <= 0:
            total_w = 100
        combined = (
            project_progress_pct * w_progress +
            milestone_pct * w_milestone +
            key_task_pct * w_key_task +
            time_pct * w_time +
            metric_pct * w_metric
        ) / total_w

        pct = min(100, max(0, combined))

        detail = {
            "mode": "project_rollup",
            "weights": {
                "project_progress": w_progress,
                "milestone": w_milestone,
                "key_task": w_key_task,
                "tracked_time": w_time,
                "metric": w_metric,
            },
            "signals": {
                "project_progress": {"pct": round(project_progress_pct, 1), "detail": project_detail},
                "milestone": {"pct": round(milestone_pct, 1), "detail": milestone_detail},
                "key_task": {"pct": round(key_task_pct, 1), "detail": key_task_detail},
                "tracked_time": {"pct": round(time_pct, 1), "detail": time_detail},
                "metric": {"pct": round(metric_pct, 1), "detail": metric_detail},
            },
            "combined_pct": round(pct, 1),
            "projects": project_detail,
        }
        return pct, detail

    # ─── Project Link Resolution ────────────────────────────

    def _get_project_links(self):
        """Return list of dicts with project info + link metadata."""
        # Prefer Goal Project Link child table
        links = self.get("linked_projects") or []
        result = []
        seen = set()

        for row in links:
            if not row.project:
                continue
            proj = self._load_project(row.project)
            if proj:
                seen.add(row.project)
                result.append({
                    "project": row.project,
                    "title": proj.get("title", ""),
                    "weight": flt(row.weight or 100),
                    "contribution_type": row.contribution_type or "اجباری",
                    "is_mandatory": cint(row.is_mandatory),
                    "sort_order": cint(row.sort_order or 0),
                    "notes": row.notes or "",
                    **proj,
                })

        # Fallback: projects that have goal=self.name but not in child table
        fallback = frappe.get_all(
            "Hambaft Project",
            filters={"goal": self.name, "user": self.user},
            fields=["name", "title", "status", "progress", "effort_type",
                     "estimated_hours", "actual_minutes"],
        )
        for p in fallback:
            if p.name not in seen:
                proj = self._load_project(p.name)
                if proj:
                    result.append({
                        "project": p.name,
                        "title": p.title,
                        "weight": 100,
                        "contribution_type": "اجباری",
                        "is_mandatory": 1,
                        "sort_order": 0,
                        "notes": "",
                        **proj,
                    })

        result.sort(key=lambda x: x.get("sort_order", 0))
        return result

    def _load_project(self, project_name):
        """Load a project's current state."""
        try:
            p = frappe.get_all(
                "Hambaft Project",
                filters={"name": project_name},
                fields=["name", "title", "status", "progress", "effort_type",
                         "estimated_hours", "actual_minutes"],
                limit=1,
            )
            if not p:
                return None
            p = p[0]
            # Count tasks by importance
            tasks = frappe.get_all(
                "Task",
                filters={"project": project_name},
                fields=["name", "status", "importance"],
            )
            total = len(tasks)
            _done = {"done", "completed", "انجام‌شده", "انجام شده"}
            done = sum(1 for t in tasks if t.status in _done)
            milestones = [t for t in tasks if (t.importance or "عادی") == "نقطه‌عطف"]
            key_tasks = [t for t in tasks if (t.importance or "عادی") == "کلیدی"]
            normal_tasks = [t for t in tasks if (t.importance or "عادی") == "عادی"]

            return {
                "status": p.status,
                "progress": flt(p.progress or 0),
                "effort_type": p.effort_type,
                "estimated_hours": flt(p.estimated_hours or 0),
                "actual_minutes": cint(p.actual_minutes or 0),
                "total_tasks": total,
                "done_tasks": done,
                "milestone_total": len(milestones),
                "milestone_done": sum(1 for t in milestones if t.status in _done),
                "key_total": len(key_tasks),
                "key_done": sum(1 for t in key_tasks if t.status in _done),
                "normal_total": len(normal_tasks),
                "normal_done": sum(1 for t in normal_tasks if t.status in _done),
            }
        except Exception:
            return None

    # ─── Five Signals ───────────────────────────────────────

    def _signal_project_progress(self, project_links):
        """Weighted average of project progress, scaled by contribution_type.

        contribution_type multipliers:
          اجباری (mandatory)   → 1.0
          پیشنهادی (recommended) → 0.7
          پشتیبان (supporting)   → 0.4
        Effective weight = per-project weight × contribution_type multiplier.
        """

        total_weighted = 0
        total_weight = 0
        details = []
        for pl in project_links:
            w = flt(pl.get("weight", 100))
            contrib_type = pl.get("contribution_type", "اجباری")
            ct_mult = self._ct_multiplier(contrib_type)
            effective_w = w * ct_mult
            prog = flt(pl.get("progress", 0))
            total_weighted += prog * effective_w
            total_weight += effective_w
            details.append({
                "project": pl["project"],
                "title": pl["title"],
                "progress": prog,
                "weight": w,
                "contribution_type": contrib_type,
                "contribution_type_multiplier": ct_mult,
                "effective_weight": round(effective_w, 1),
                "is_mandatory": pl.get("is_mandatory", 1),
            })

        if total_weight <= 0:
            return 0, details

        pct = min(100, total_weighted / total_weight)
        return pct, details

    def _signal_milestone(self, project_links):
        """% of milestone tasks completed across all linked projects, weighted by contribution_type.

        contribution_type multipliers:
          اجباری (mandatory)   → 1.0
          پیشنهادی (recommended) → 0.7
          پشتیبان (supporting)   → 0.4
        Each project's milestone done/total ratio is weighted by its effective weight.
        """

        total_weighted_done = 0
        total_weighted_count = 0
        details_by_project = []

        for pl in project_links:
            contrib_type = pl.get("contribution_type", "اجباری")
            ct_mult = self._ct_multiplier(contrib_type)
            w = flt(pl.get("weight", 100))
            effective_w = w * ct_mult

            m_total = pl.get("milestone_total", 0)
            m_done = pl.get("milestone_done", 0)

            if m_total > 0:
                ratio = m_done / m_total
            else:
                # Fall back to overall task completion for this project
                t_total = pl.get("total_tasks", 0)
                t_done = pl.get("done_tasks", 0)
                ratio = (t_done / t_total) if t_total > 0 else 0

            total_weighted_done += ratio * effective_w
            total_weighted_count += effective_w
            details_by_project.append({
                "project": pl.get("project", ""),
                "contribution_type": contrib_type,
                "effective_weight": round(effective_w, 1),
                "milestone_total": m_total,
                "milestone_done": m_done,
                "milestone_ratio": round(ratio, 3),
            })

        if total_weighted_count <= 0:
            return 0, {"milestone_total": 0, "milestone_done": 0, "projects": details_by_project}

        pct = min(100, (total_weighted_done / total_weighted_count) * 100)
        # Also provide raw totals for display
        raw_total = sum(pl.get("milestone_total", 0) for pl in project_links)
        raw_done = sum(pl.get("milestone_done", 0) for pl in project_links)
        return pct, {
            "milestone_total": raw_total,
            "milestone_done": raw_done,
            "weighted_pct": round(pct, 1),
            "projects": details_by_project,
        }

    def _signal_key_task(self, project_links):
        """% of key tasks completed, weighted by contribution_type.

        contribution_type multipliers:
          اجباری (mandatory)   → 1.0
          پیشنهادی (recommended) → 0.7
          پشتیبان (supporting)   → 0.4
        Each project's key task done/total ratio is weighted by its effective weight.
        """

        total_weighted_done = 0
        total_weighted_count = 0
        has_key_tasks = False
        details_by_project = []

        for pl in project_links:
            contrib_type = pl.get("contribution_type", "اجباری")
            ct_mult = self._ct_multiplier(contrib_type)
            w = flt(pl.get("weight", 100))
            effective_w = w * ct_mult

            key_total = pl.get("key_total", 0)
            key_done = pl.get("key_done", 0)

            if key_total > 0:
                has_key_tasks = True
                ratio = key_done / key_total
                total_weighted_done += ratio * effective_w
                total_weighted_count += effective_w
                details_by_project.append({
                    "project": pl.get("project", ""),
                    "contribution_type": contrib_type,
                    "effective_weight": round(effective_w, 1),
                    "key_total": key_total,
                    "key_done": key_done,
                    "key_ratio": round(ratio, 3),
                    "used_fallback": False,
                })

        # If no key tasks anywhere, fall back to normal task completion
        if not has_key_tasks:
            for pl in project_links:
                contrib_type = pl.get("contribution_type", "اجباری")
                ct_mult = self._ct_multiplier(contrib_type)
                w = flt(pl.get("weight", 100))
                effective_w = w * ct_mult

                normal_total = pl.get("normal_total", 0)
                normal_done = pl.get("normal_done", 0)
                ratio = (normal_done / normal_total) if normal_total > 0 else 0
                total_weighted_done += ratio * effective_w
                total_weighted_count += effective_w
                details_by_project.append({
                    "project": pl.get("project", ""),
                    "contribution_type": contrib_type,
                    "effective_weight": round(effective_w, 1),
                    "normal_total": normal_total,
                    "normal_done": normal_done,
                    "normal_ratio": round(ratio, 3),
                    "used_fallback": True,
                })

        if total_weighted_count <= 0:
            return 0, {"key_total": 0, "key_done": 0, "projects": details_by_project}

        pct = min(100, (total_weighted_done / total_weighted_count) * 100)
        # Also provide raw totals for display
        raw_key_total = sum(pl.get("key_total", 0) for pl in project_links)
        raw_key_done = sum(pl.get("key_done", 0) for pl in project_links)
        raw_normal_total = sum(pl.get("normal_total", 0) for pl in project_links) if not has_key_tasks else 0
        raw_normal_done = sum(pl.get("normal_done", 0) for pl in project_links) if not has_key_tasks else 0
        result = {
            "key_total": raw_key_total,
            "key_done": raw_key_done,
            "weighted_pct": round(pct, 1),
            "projects": details_by_project,
        }
        if not has_key_tasks:
            result["normal_total"] = raw_normal_total
            result["normal_done"] = raw_normal_done
            result["normal_fallback"] = True
        return pct, result

    def _signal_tracked_time(self, project_links):
        """Normalised tracked time: actual vs estimated, capped at 100%.

        contribution_type scaling applied: mandatory projects' time counts fully,
        supporting projects' time counts less toward the overall signal.
        """

        total_weighted_estimated = 0
        total_weighted_actual = 0
        details = []

        for pl in project_links:
            est = flt(pl.get("estimated_hours", 0))
            act_min = cint(pl.get("actual_minutes", 0))
            act_hrs = act_min / 60.0
            contrib_type = pl.get("contribution_type", "اجباری")
            ct_mult = self._ct_multiplier(contrib_type)

            total_weighted_estimated += est * ct_mult
            total_weighted_actual += act_hrs * ct_mult
            details.append({
                "project": pl["project"],
                "estimated_hours": est,
                "actual_minutes": act_min,
                "actual_hours": round(act_hrs, 1),
                "contribution_type": contrib_type,
                "contribution_type_multiplier": ct_mult,
            })

        if total_weighted_estimated <= 0:
            # No estimates — time signal is neutral, don't inflate
            return 50, {"note": "no_estimates_neutral", "details": details}

        # Ratio with cap: logging more than 1.5x estimated should not give >100%
        ratio = min(1.0, total_weighted_actual / total_weighted_estimated)
        pct = ratio * 100
        return pct, {"ratio": round(ratio, 2), "weighted_estimated_hours": round(total_weighted_estimated, 1),
                      "weighted_actual_hours": round(total_weighted_actual, 1), "details": details}

    def _signal_metric(self):
        """KPI metric: current_value / target_value."""
        if not self.target_value or self.target_value <= 0:
            return 0, {"note": "no_metric_target"}
        pct = min(100, (flt(self.current_value or 0) / flt(self.target_value)) * 100)
        return pct, {"current": flt(self.current_value or 0), "target": flt(self.target_value)}

    # ─── Health Computation ─────────────────────────────────

    def compute_health(self, progress_pct, detail):
        """Derive health state from progress detail. Returns (state, health_detail)."""
        signals = detail.get("signals", {})

        # If not project_rollup, use simpler logic
        if detail.get("mode") != "project_rollup":
            return self._compute_simple_health(progress_pct, detail)

        proj_pct = signals.get("project_progress", {}).get("pct", 0)
        milestone_pct = signals.get("milestone", {}).get("pct", 0)
        key_pct = signals.get("key_task", {}).get("pct", 0)
        time_pct = signals.get("tracked_time", {}).get("pct", 0)
        metric_pct = signals.get("metric", {}).get("pct", 0)

        contradictions = []
        warnings = []

        # Contradiction 1: lots of time but milestone progress low
        if time_pct > 70 and milestone_pct < 30:
            contradictions.append({
                "type": "effort_without_outcome",
                "message": "زمان زیادی صرف شده اما نقطه‌عطف‌ها تکمیل نشده‌اند",
                "time_pct": time_pct,
                "milestone_pct": milestone_pct,
            })

        # Contradiction 2: project progress high but metric lagging
        if proj_pct > 60 and metric_pct < 30 and self.target_value and self.target_value > 0:
            contradictions.append({
                "type": "project_ahead_metric_behind",
                "message": "پروژه‌ها پیشرفته اما سنجه/KPI عقب است",
                "project_pct": proj_pct,
                "metric_pct": metric_pct,
            })

        # Contradiction 3: metric achieved but required projects incomplete
        project_detail = signals.get("project_progress", {}).get("detail", [])
        mandatory_incomplete = [
            p for p in project_detail
            if isinstance(p, dict) and p.get("is_mandatory") and p.get("progress", 0) < 100
        ]
        if metric_pct >= 80 and mandatory_incomplete:
            contradictions.append({
                "type": "metric_met_projects_incomplete",
                "message": "سنجه محقق شده اما پروژه‌های اجباری ناتمام‌اند",
                "metric_pct": metric_pct,
                "incomplete_mandatory": len(mandatory_incomplete),
            })

        # Contradiction 4: supporting projects ahead of mandatory ones
        supporting_projects = [
            p for p in project_detail
            if isinstance(p, dict) and p.get("contribution_type") == "پشتیبان" and p.get("progress", 0) > 60
        ]
        mandatory_lagging = [
            p for p in project_detail
            if isinstance(p, dict) and p.get("contribution_type") == "اجباری" and p.get("progress", 0) < 30
        ]
        if supporting_projects and mandatory_lagging:
            warnings.append({
                "type": "supporting_ahead_mandatory_lagging",
                "message": "پروژه‌های پشتیبان پیشرفته اما اجباری‌ها عقب‌مانده‌اند — اولویت‌بندی بررسی شود",
                "supporting_ahead": len(supporting_projects),
                "mandatory_lagging": len(mandatory_lagging),
            })

        # Warning: very low time with decent progress (might be stale)
        if time_pct < 20 and proj_pct > 60:
            warnings.append({
                "type": "stale_progress",
                "message": "پیشرفت بالا اما زمان کمی صرف شده — ممکن است قدیمی باشد",
            })

        # Determine health state
        if contradictions:
            state = "خارج_از_مسیر"
        elif warnings:
            state = "نیاز_به_بررسی"
        elif progress_pct >= 60:
            state = "در_مسیر"
        elif progress_pct >= 30:
            state = "در_خطر"
        else:
            state = "خارج_از_مسیر"

        health_detail = {
            "state": state,
            "contradictions": contradictions,
            "warnings": warnings,
            "signal_summary": {
                "project_progress": proj_pct,
                "milestone": milestone_pct,
                "key_task": key_pct,
                "tracked_time": time_pct,
                "metric": metric_pct,
            },
        }
        return state, health_detail

    def _compute_simple_health(self, progress_pct, detail):
        """Simple health for non-project goals."""
        mode = detail.get("mode", "")
        if progress_pct >= 60:
            state = "در_مسیر"
        elif progress_pct >= 30:
            state = "در_خطر"
        else:
            state = "خارج_از_مسیر"

        # Check for at-risk if target_date is near
        if self.target_date:
            days_left = (getdate(self.target_date) - getdate(today())).days
            if days_left < 7 and progress_pct < 80:
                state = "در_خطر"
            if days_left < 0 and progress_pct < 100:
                state = "خارج_از_مسیر"

        return state, {"state": state, "mode": mode, "days_remaining": (
            (getdate(self.target_date) - getdate(today())).days if self.target_date else None
        )}

    # ─── Completion Policy ──────────────────────────────────

    def check_completion(self, progress_pct, detail):
        """Check if goal should be marked complete based on policy."""
        policy = self.completion_policy or "آستانه_پیشرفت"
        threshold = flt(self.completion_threshold or 100)

        if policy == "آستانه_پیشرفت":
            return progress_pct >= threshold

        elif policy == "آستانه_به_علاوه_پروژه‌های_اجباری":
            if progress_pct < threshold:
                return False
            return self._all_mandatory_projects_complete()

        elif policy == "سنجه_به_علاوه_پروژه‌های_اجباری":
            metric_pct = flt(detail.get("signals", {}).get("metric", {}).get("pct", 0)) \
                if detail.get("mode") == "project_rollup" else 0
            if self.target_value and self.target_value > 0:
                metric_pct = min(100, (flt(self.current_value or 0) / flt(self.target_value)) * 100)
            if metric_pct < threshold:
                return False
            return self._all_mandatory_projects_complete()

        elif policy == "همه_پروژه‌ها_تکمیل":
            return self._all_linked_projects_complete()

        elif policy == "آستانه_به_علاوه_نقاط_عطف":
            if progress_pct < threshold:
                return False
            return self._all_milestones_complete()

        # Default: threshold only
        return progress_pct >= threshold

    def _all_mandatory_projects_complete(self):
        """Check all mandatory project links are complete."""
        links = self._get_project_links()
        mandatory = [pl for pl in links if pl.get("is_mandatory")]
        if not mandatory:
            # No explicit mandatory links — check all projects with goal=self
            mandatory = links
        for pl in mandatory:
            if pl.get("status") != "تکمیل‌شده" and pl.get("progress", 0) < 100:
                return False
        return True

    def _all_linked_projects_complete(self):
        links = self._get_project_links()
        if not links:
            return True
        for pl in links:
            if pl.get("status") != "تکمیل‌شده" and pl.get("progress", 0) < 100:
                return False
        return True

    def _all_milestones_complete(self):
        """Check all milestone-importance tasks across linked projects are done."""
        links = self._get_project_links()
        total = sum(pl.get("milestone_total", 0) for pl in links)
        done = sum(pl.get("milestone_done", 0) for pl in links)
        if total == 0:
            return True
        return done >= total

    # ─── Snapshot ───────────────────────────────────────────

    def save_snapshot(self, progress_pct, detail, health_state, health_detail, trigger="api_call"):
        """Save a lightweight snapshot of current goal progress."""
        try:
            snapshot = frappe.new_doc("Goal Progress Snapshot")
            snapshot.goal = self.name
            snapshot.user = self.user
            snapshot.progress_percent = flt(progress_pct)
            snapshot.health_state = health_state
            snapshot.detail_json = json.dumps({
                "progress_detail": detail,
                "health_detail": health_detail,
            }, ensure_ascii=False)
            snapshot.snapshot_date = today()
            snapshot.trigger_type = trigger
            snapshot.insert(ignore_permissions=True)
            frappe.db.commit()

            # Also store on the goal itself
            self.last_snapshot_json = json.dumps({
                "progress_pct": flt(progress_pct),
                "health_state": health_state,
                "detail": detail,
                "health_detail": health_detail,
            }, ensure_ascii=False)
            self.last_snapshot_at = now_datetime()
        except Exception as e:
            frappe.log_error(f"Goal snapshot save error: {e}")

    # ─── Finance (unchanged) ────────────────────────────────

    def _progress_finance_balance(self):
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

    # ─── Weighted Composite (now uses project rollup engine) ──

    def _progress_weighted_composite(self):
        """Weighted composite: average habit + project + finance + metric contributions."""
        components = []

        habit_links = self.get("linked_habits") or []
        if habit_links:
            habit_pct, _ = self._progress_habit_rollup()
            components.append(("habits", habit_pct, 1.0))

        project_links = self._get_project_links()
        if project_links:
            proj_pct, _ = self._progress_project_rollup()
            components.append(("projects", proj_pct, 1.0))

        fin_links = self.get("linked_finance_accounts") or []
        if fin_links:
            fin_pct, _ = self._progress_finance_balance()
            components.append(("finance", fin_pct, 1.0))

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
