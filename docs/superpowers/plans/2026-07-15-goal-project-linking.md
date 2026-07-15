# Goal / Project Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project summary navigation inside goals and allow changing a project's goal from both goal detail and project detail without removing existing KPIs.

**Architecture:** Keep the current legacy workspace/state model intact and add one explicit project-move action in `App.tsx`. Reuse existing goal/project detail routes and enrich the UI with summary cards and a shared metadata rail instead of rewriting dashboards.

**Tech Stack:** React, TypeScript, Vitest, existing legacy Hambaft workspace components, Frappe-backed project persistence.

## Global Constraints

- Keep `goals/:goalId` and `projects/:projectId` routes unchanged.
- Preserve current KPI blocks and contribution/health badges.
- Do not show full task lists inside goal detail project cards.
- Use TDD: write failing tests first, then minimal implementation.

---

### Task 1: Add tests for project reassignment and goal/project navigation UI

**Files:**
- Modify: `frontend/src/__tests__/task-persistence.test.tsx`
- Create: `frontend/src/__tests__/goal-project-linking.test.tsx`

**Interfaces:**
- Consumes: `GoalDashboard`, `ProjectDashboard`, `ProjectDetailView`
- Produces: regression coverage for `onSelectProject`, `onMoveProjectToGoal`, and project metadata rendering

- [ ] Write failing tests for:
  - project cards in goal detail show `ورود به پروژه`
  - project dashboard detail button still navigates correctly
  - project detail shows current goal label
  - changing goal invokes the move handler with `(fromGoalId, projectId, toGoalId)`

- [ ] Run targeted Vitest commands and confirm failures are about missing UI/handlers.

- [ ] Commit test-only red state if useful locally; otherwise proceed directly to green.

### Task 2: Add project move handler to workspace state

**Files:**
- Modify: `frontend/src/legacy/App.tsx`
- Modify: `frontend/src/legacy/types.ts`

**Interfaces:**
- Consumes: existing `findProjectByIds`, `updateProjectRecord`, `runSync`
- Produces: `handleMoveProjectToGoal(fromGoalId, projectId, toGoalId)` and expanded `onUpdateProjectDetails` support for goal reassignment

- [ ] Implement a minimal pure helper or inline state update that moves a project from one goal bucket to another.
- [ ] Keep tasks, milestones, notes, and KPI fields intact during the move.
- [ ] Sync the backend via `updateProjectRecord(project.id, updatedProject, toGoalId)`.
- [ ] Roll back local state on sync failure.

### Task 3: Redesign goal detail project section into summary cards

**Files:**
- Modify: `frontend/src/legacy/components/GoalDetailView.tsx`

**Interfaces:**
- Consumes: `goal.projects`, `onAddProjectToGoal`, new `onSelectProject`, new `onMoveProjectToGoal`
- Produces: summary cards with enter-project CTA and goal-change CTA

- [ ] Replace the full-task-heavy project presentation in goal detail with summary cards.
- [ ] Show project title, description, status, progress, task counts, milestone counts, tracked time, and contribution/health context.
- [ ] Add `ورود به پروژه` action.
- [ ] Add compact goal picker / reassignment UI on each card.

### Task 4: Add metadata rail and goal picker to project detail

**Files:**
- Modify: `frontend/src/legacy/components/ProjectDetailView.tsx`

**Interfaces:**
- Consumes: current `project` object plus `goals` list and new `onMoveProjectToGoal`
- Produces: task-detail-like metadata panel for project detail

- [ ] Add metadata display for status, priority, importance, schedule, due date, estimate, spent time, area, project, goal.
- [ ] Keep KPI blocks already on the page.
- [ ] Add a visible goal field with change-goal action.
- [ ] Keep `onNavigateEntity('goals', goalId)` support.

### Task 5: Wire props through workspace and verify end-to-end

**Files:**
- Modify: `frontend/src/legacy/App.tsx`
- Modify: `frontend/src/legacy/components/GoalDashboard.tsx` only if navigation affordances need prop threading

**Interfaces:**
- Consumes: selected route state and new move handler
- Produces: complete goals ↔ projects navigation and editing flow

- [ ] Thread new props from `App.tsx` into `GoalDetailView` and `ProjectDetailView`.
- [ ] Ensure project detail always renders correct current goal after reassignment.
- [ ] Run focused tests, then broader related suite, then production build.
- [ ] Commit the green implementation.
