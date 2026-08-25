# Recurring Tasks and Daily Occurrences

## Goal

Make long-term tasks actionable by storing a reusable schedule and deriving the tasks due today from that schedule. Completing a checkbox records only the current date's occurrence, so recurring plans remain available for their next execution.

## User-facing behavior

- `今日` shows one-off tasks due today plus recurring tasks whose rule matches today.
- `长期计划` shows all recurring task templates, including the next execution date and schedule summary. A recurring task due today can be completed from either view; a future task's checkbox is disabled until its due date.
- `全部任务` shows all task templates. `已完成` shows templates with at least one recorded completion date.
- A one-off task has one execution date.
- A daily task runs on every date on or after its start date.
- A weekly task runs on selected weekdays on or after its start date.
- An interval task runs every N days from its start date.
- Completion rate is calculated against today's due occurrences for `今日`, and against all current task templates for other summary views only when no date-scoped list is available.

## Data model

```js
{
  id: "task-id",
  title: "Read 20 pages",
  detail: "Personal · 25 min",
  schedule: {
    type: "daily" | "weekly" | "interval" | "once",
    startDate: "2026-08-25",
    date: "2026-08-25",       // once only
    weekdays: [1, 3],          // weekly only, Monday = 1
    intervalDays: 3            // interval only
  },
  completedDates: ["2026-08-25"]
}
```

`normalizeTask` can convert legacy tasks with `bucket` and `completed` fields when an explicit migration is needed: Today tasks become one-off tasks on the current date, and existing long-term tasks become weekly plans on the current weekday. The schedule-aware prototype uses a new storage key and seeds fresh examples when no v2 data exists, avoiding guesses about recurrence rules for old demo data.

## Interface

- Keep the selected light Apple-inspired visual language.
- Rename the long-term navigation label to `长期计划 / Long-term`.
- Keep quick add for a one-off task. Add a calendar button beside the quick-add input that opens a composer for date and repeat settings.
- The composer includes task title, schedule type, date/start date, weekday chips for weekly schedules, and an interval number field for interval schedules.
- Add a compact palette control with five preset accent colors plus a native custom color picker; persist the selected accent locally.
- Progress copy should say `点击左侧勾选框即可更新进度`.

## Constraints

- No backend or authentication; persist normalized task templates in `localStorage`.
- Date calculations use local calendar dates in `YYYY-MM-DD` form to avoid time-zone shifts.
- Invalid interval values are clamped to a minimum of 1 day.
- A weekly task must have at least one weekday selected; default to today's weekday.
