from __future__ import annotations

def is_gallery_image_file(
    file_type: str | None = None,
    file_name: str | None = None,
    file_url: str | None = None,
) -> bool:
    """Accept both MIME types and extension-like file_type values from File docs."""
    image_types = ("image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp")
    image_extensions = {"jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"}

    normalized_type = (file_type or "").strip().lower().lstrip(".")
    if normalized_type in image_types or normalized_type in image_extensions:
        return True
    if normalized_type.startswith("image/"):
        return True

    for candidate in (file_name, file_url):
        value = (candidate or "").strip().lower()
        if not value:
            continue
        base = value.split("?")[0].split("#")[0].rsplit("/", 1)[-1]
        if "." not in base:
            continue
        ext = base.rsplit(".", 1)[-1]
        if ext in image_extensions:
            return True

    return False


def plan_gallery_scope(
    source_doctype: str | None,
    *,
    source_name: str | None = None,
    task_goal: str | None = None,
    task_project: str | None = None,
    project_goal: str | None = None,
) -> tuple[str | None, str | None, bool]:
    """Resolve gallery board/section placement from linked task/project/goal data.

    Returns `(board_goal_name, section_project_name, is_orphan)`.
    """
    if source_doctype == "Task":
        board_goal = task_goal or project_goal
        if board_goal:
            return board_goal, task_project or None, False
        return None, None, True

    if source_doctype == "Hambaft Project":
        if project_goal:
            return project_goal, None, False
        return None, None, True

    if source_doctype == "Goal":
        if source_name:
            return source_name, None, False
        return None, None, True

    return None, None, True
