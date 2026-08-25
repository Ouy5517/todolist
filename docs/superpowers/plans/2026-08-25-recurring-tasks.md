# Recurring Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make long-term task plans generate due-today occurrences with date-aware completion and configurable recurrence rules.

**Architecture:** Keep task templates in local storage and move schedule/date logic into pure functions in `src/taskUtils.js`. The React app derives today's visible tasks from those functions, records completion by date, and uses a small task composer for schedule configuration.

**Tech Stack:** React 19, Vite 6, Phosphor Icons, browser localStorage, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-25-recurring-tasks-design.md`

## Global Constraints

- Date calculations use local calendar dates in `YYYY-MM-DD` form.
- A weekly task must have at least one weekday selected.
- Invalid interval values are clamped to a minimum of 1 day.
- The selected light visual language remains unchanged.
- Accent color remains user-selectable through five presets or a custom hex color.
- No backend, authentication, or external API is added.

---

### Task 1: Date-aware task utilities

**Files:**
- Modify: `src/taskUtils.js`
- Modify: `src/taskUtils.test.js`

**Interfaces:**
- Produces `toDateKey(date)`, `isTaskDueOnDate(task, dateKey)`, `isOccurrenceComplete(task, dateKey)`, `getNextDueDate(task, fromDateKey)`, `getVisibleTasks(tasks, options)`, and `calculateProgress(tasks, bucket, dateKey)`.

- [x] **Step 1: Replace the old bucket tests with failing recurrence tests**

```js
assert.equal(isTaskDueOnDate(dailyTask, "2026-08-25"), true);
assert.equal(isTaskDueOnDate(dailyTask, "2026-08-24"), false);
assert.equal(isTaskDueOnDate(weeklyTask, "2026-08-26"), true);
assert.equal(isTaskDueOnDate(weeklyTask, "2026-08-25"), false);
assert.equal(isTaskDueOnDate(intervalTask, "2026-08-28"), true);
assert.equal(isTaskDueOnDate(intervalTask, "2026-08-27"), false);
assert.equal(calculateProgress([dailyTask, completedDailyTask], "today", "2026-08-25"), 50);
```

- [x] **Step 2: Run the targeted test and verify it fails because the date APIs are missing**

Run: `npm test`

Expected: FAIL with missing exports or undefined recurrence helpers.

- [x] **Step 3: Implement calendar-safe helpers and recurrence matching**

Use `Date.UTC(year, month - 1, day)` for differences, map Sunday to 0 and Monday to 1 for weekly rules, and return `false` for dates before `startDate`.

- [x] **Step 4: Run the tests and verify the recurrence cases pass**

Run: `npm test`

Expected: all date, filtering, completion, and progress tests pass.

### Task 2: Normalize task templates and add schedule composer state

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes the task utility functions from Task 1.
- Produces normalized task templates with `schedule` and `completedDates`, plus composer state for `once`, `daily`, `weekly`, and `interval`.

- [x] **Step 1: Add a failing behavior assertion for a legacy task migration**

Add a utility-level fixture that converts `{ bucket: "today", completed: true }` into a one-off task whose `completedDates` includes the current date, and converts `{ bucket: "long-term" }` into a weekly task using the current weekday.

- [x] **Step 2: Run `npm test` and verify migration behavior is not implemented**

Expected: FAIL until normalization is added.

- [x] **Step 3: Add `normalizeTask`, `loadTasks`, and initial schedules**

Read `quiet-list-tasks-v2` and normalize the stored templates. When no v2 data exists, seed schedule-aware examples that make at least one daily, weekly, and interval plan visible in today's list. Keep the pure `normalizeTask` migration helper for explicit legacy conversion rather than guessing recurrence rules from the previous demo's bucket data.

- [x] **Step 4: Add composer state and handlers**

Track title, schedule type, date/start date, weekdays, and interval days. Quick add creates a one-off today task; the calendar button opens the composer; submit creates a normalized template.

### Task 3: Derive today's list and update the UI

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes normalized templates and recurrence helpers.
- Produces daily due rows, long-term plan rows with next dates, date/repeat composer modal, date-aware completion toggles, and progress calculated from due-today tasks.

- [x] **Step 1: Render the daily view from `isTaskDueOnDate`**

Replace bucket filtering with the current date key. A checked row calls `toggleOccurrence(task.id, todayKey)` and appends/removes only that date in `completedDates`.

- [x] **Step 2: Render long-term plans with schedule summaries**

Show `每天`, `每周一/三`, or `每隔 3 天` plus `下一次：YYYY-MM-DD`. Disable the checkbox when a recurring task is not due today.

- [x] **Step 3: Add the task composer modal**

Use accessible labeled controls for the schedule type and date fields. Weekly weekday chips must have visible selected state; interval input must have `min="1"`.

- [x] **Step 4: Update progress copy and layout styles**

Use `点击左侧勾选框即可更新进度`, keep the existing three-column visual hierarchy, and make the composer usable at the mobile breakpoint.

Add the compact palette popover with preset swatches, custom color input, and local persistence.

### Task 4: Verify behavior and visual regression

**Files:**
- Modify: `design-qa.md`
- Regenerate: `design-qa-desktop.png`, `design-qa-comparison.png`

- [x] **Step 1: Run unit tests and production build**

Run: `npm test` and `npm run build`

Expected: all tests pass and Vite exits with code 0.

- [x] **Step 2: Run the local browser and verify the core journey**

Verify: configure a weekly task, see it in `长期计划`, confirm it appears in `今日` only on matching dates, check it off, and confirm today's percentage changes without removing the plan.

- [x] **Step 3: Verify mobile composer layout and console errors**

Use the 390 × 844 viewport, open the composer, inspect all fields, close it, and confirm the browser reports no errors.

- [x] **Step 4: Capture a clean 1440 × 1024 screenshot and update the QA report**

Compare the selected source visual and the final desktop implementation side-by-side. Record the new daily/plan states, remaining P3 notes, and `final result: passed`.
