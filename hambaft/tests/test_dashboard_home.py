from __future__ import annotations

import unittest

from hambaft.dashboard_home import (
    build_finance_snapshot,
    build_summary_metrics,
    select_agenda,
    select_focus_goal,
    select_priority_item,
)


class TestSelectPriorityItem(unittest.TestCase):
    def test_prefers_high_priority_task_due_today(self):
        tasks = [
            {
                "name": "TASK-2",
                "title": "کار عادی",
                "priority": "متوسط",
                "due_date": "2026-07-01 12:00:00",
                "description": "کم‌اهمیت‌تر",
            },
            {
                "name": "TASK-1",
                "title": "جمع‌بندی نهایی",
                "priority": "فوری",
                "due_date": "2026-07-01 10:00:00",
                "description": "باید همین امروز تمام شود",
            },
        ]

        result = select_priority_item(tasks, [], "2026-07-01")

        self.assertEqual(result["type"], "task")
        self.assertEqual(result["title"], "جمع‌بندی نهایی")
        self.assertEqual(result["priority"], "فوری")

    def test_falls_back_to_next_event_when_no_timed_task(self):
        events = [
            {
                "name": "EV-1",
                "title": "جلسه طراحی",
                "event_type": "جلسه",
                "starts_at": "2026-07-01 14:30:00",
                "ends_at": "2026-07-01 15:30:00",
                "location": "استودیو",
            }
        ]

        result = select_priority_item([], events, "2026-07-01")

        self.assertEqual(result["type"], "event")
        self.assertEqual(result["title"], "جلسه طراحی")
        self.assertEqual(result["subtitle"], "استودیو")


class TestSelectAgenda(unittest.TestCase):
    def test_returns_two_future_events_sorted_by_start_time(self):
        events = [
            {"title": "ورزش", "starts_at": "2026-07-01 18:00:00", "event_type": "سلامتی"},
            {"title": "مرور شب", "starts_at": "2026-07-01 21:00:00", "event_type": "شخصی"},
            {"title": "جلسه تیم", "starts_at": "2026-07-01 10:00:00", "event_type": "جلسه"},
        ]

        result = select_agenda(events, "2026-07-01")

        self.assertEqual([item["title"] for item in result], ["جلسه تیم", "ورزش"])


class TestSelectFocusGoal(unittest.TestCase):
    def test_prefers_nearest_active_goal_and_next_milestone(self):
        goals = [
            {
                "name": "GOAL-1",
                "title": "هم‌بافت نسخه یک",
                "status": "فعال",
                "progress_percent": 38,
                "target_date": "2026-07-20",
            },
            {
                "name": "GOAL-2",
                "title": "بودجه شخصی",
                "status": "فعال",
                "progress_percent": 82,
                "target_date": "2026-08-01",
            },
        ]
        milestones = {
            "GOAL-1": [
                {"milestone_title": "تکمیل صفحه خانه", "status": "فعال", "target_date": "2026-07-05"}
            ]
        }

        result = select_focus_goal(goals, milestones)

        self.assertEqual(result["title"], "هم‌بافت نسخه یک")
        self.assertEqual(result["next_milestone"], "تکمیل صفحه خانه")


class TestBuildFinanceSnapshot(unittest.TestCase):
    def test_combines_summary_budget_and_next_payment(self):
        finance_summary = {"expense": 15800000}
        budgets = [
            {
                "budget_title": "بودجه تیر",
                "status": "فعال",
                "total_expense_plan": 22000000,
            }
        ]
        bills = [
            {"bill_name": "اینترنت", "amount": 780000, "due_date": "2026-07-03", "status": "پیش‌رو"}
        ]
        subscriptions = [
            {
                "subscription_name": "نتفلیکس",
                "amount": 420000,
                "next_billing_date": "2026-07-08",
                "status": "فعال",
            }
        ]

        result = build_finance_snapshot(finance_summary, budgets, bills, subscriptions)

        self.assertEqual(result["month_expense"], 15800000)
        self.assertEqual(result["remaining_budget"], 6200000)
        self.assertEqual(result["next_payment"]["title"], "اینترنت")


class TestBuildSummaryMetrics(unittest.TestCase):
    def test_creates_home_capsules_from_available_data(self):
        tasks = [{"title": "الف"}, {"title": "ب"}, {"title": "ج"}]
        pending_habits = [{"name": "آب"}, {"name": "ورزش"}]
        water_status = {"consumed_ml": 1600, "target_ml": 2000, "percent": 80}
        finance_snapshot = {"remaining_budget": 6200000}
        agenda = [{"title": "جلسه طراحی", "starts_at": "2026-07-01 14:30:00"}]

        result = build_summary_metrics(
            tasks_due=tasks,
            habits_pending=pending_habits,
            water_status=water_status,
            finance_snapshot=finance_snapshot,
            agenda=agenda,
        )

        self.assertEqual(result["tasks"]["value"], 3)
        self.assertEqual(result["habits"]["value"], 2)
        self.assertEqual(result["water_sleep"]["current"], 1600)
        self.assertEqual(result["next_plan"]["title"], "جلسه طراحی")


if __name__ == "__main__":
    unittest.main()
