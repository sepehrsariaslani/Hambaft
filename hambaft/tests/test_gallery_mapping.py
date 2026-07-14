from __future__ import annotations

import unittest

from hambaft.gallery_mapping import is_gallery_image_file, plan_gallery_scope


class TestPlanGalleryScope(unittest.TestCase):
    def test_task_with_goal_and_project_maps_to_board_and_section(self):
        board, section, is_orphan = plan_gallery_scope(
            "Task",
            source_name="TASK-1",
            task_goal="GOAL-1",
            task_project="PROJ-1",
        )

        self.assertEqual(board, "GOAL-1")
        self.assertEqual(section, "PROJ-1")
        self.assertFalse(is_orphan)

    def test_task_inherits_goal_from_project_when_task_goal_missing(self):
        board, section, is_orphan = plan_gallery_scope(
            "Task",
            source_name="TASK-2",
            task_project="PROJ-2",
            project_goal="GOAL-2",
        )

        self.assertEqual(board, "GOAL-2")
        self.assertEqual(section, "PROJ-2")
        self.assertFalse(is_orphan)

    def test_project_image_stays_board_level(self):
        board, section, is_orphan = plan_gallery_scope(
            "Hambaft Project",
            source_name="PROJ-3",
            project_goal="GOAL-3",
        )

        self.assertEqual(board, "GOAL-3")
        self.assertIsNone(section)
        self.assertFalse(is_orphan)

    def test_goal_image_maps_to_board_level(self):
        board, section, is_orphan = plan_gallery_scope(
            "Goal",
            source_name="GOAL-4",
        )

        self.assertEqual(board, "GOAL-4")
        self.assertIsNone(section)
        self.assertFalse(is_orphan)

    def test_missing_goal_context_becomes_orphan(self):
        board, section, is_orphan = plan_gallery_scope(
            "Task",
            source_name="TASK-5",
            task_project="PROJ-5",
        )

        self.assertIsNone(board)
        self.assertIsNone(section)
        self.assertTrue(is_orphan)


class TestGalleryImageDetection(unittest.TestCase):
    def test_accepts_extension_style_file_type(self):
        self.assertTrue(is_gallery_image_file("PNG", "sample.png", "/private/files/sample.png"))

    def test_accepts_mime_type(self):
        self.assertTrue(is_gallery_image_file("image/webp", "sample.webp", "/files/sample.webp"))

    def test_rejects_non_image_file(self):
        self.assertFalse(is_gallery_image_file("PDF", "report.pdf", "/private/files/report.pdf"))


if __name__ == "__main__":
    unittest.main()
