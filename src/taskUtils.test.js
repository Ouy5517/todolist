import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateProgress,
  getNextDueDate,
  getVisibleTasks,
  isOccurrenceComplete,
  isTaskDueOnDate,
  normalizeColor,
  normalizeTask,
} from "./taskUtils.js";

const dailyTask = {
  id: "daily-read",
  title: "Read 20 pages",
  schedule: { type: "daily", startDate: "2026-08-25" },
  completedDates: [],
};

const completedDailyTask = {
  ...dailyTask,
  id: "daily-stretch",
  title: "Stretch for 10 minutes",
  completedDates: ["2026-08-25"],
};

const weeklyTask = {
  id: "weekly-review",
  title: "Review weekly plan",
  schedule: { type: "weekly", startDate: "2026-08-25", weekdays: [4] },
  completedDates: [],
};

const intervalTask = {
  id: "interval-run",
  title: "Go for a run",
  schedule: { type: "interval", startDate: "2026-08-25", intervalDays: 3 },
  completedDates: [],
};

describe("recurring task dates", () => {
  it("matches daily, weekly, and interval schedules", () => {
    assert.equal(isTaskDueOnDate(dailyTask, "2026-08-25"), true);
    assert.equal(isTaskDueOnDate(dailyTask, "2026-08-24"), false);
    assert.equal(isTaskDueOnDate(weeklyTask, "2026-08-27"), true);
    assert.equal(isTaskDueOnDate(weeklyTask, "2026-08-25"), false);
    assert.equal(isTaskDueOnDate(intervalTask, "2026-08-28"), true);
    assert.equal(isTaskDueOnDate(intervalTask, "2026-08-27"), false);
  });

  it("finds the next due date from a starting date", () => {
    assert.equal(getNextDueDate(weeklyTask, "2026-08-25"), "2026-08-27");
    assert.equal(getNextDueDate(intervalTask, "2026-08-26"), "2026-08-28");
  });
});

describe("date-scoped completion", () => {
  it("calculates today's progress from due occurrences", () => {
    assert.equal(calculateProgress([dailyTask, completedDailyTask], "today", "2026-08-25"), 50);
    assert.equal(isOccurrenceComplete(completedDailyTask, "2026-08-25"), true);
    assert.equal(isOccurrenceComplete(completedDailyTask, "2026-08-26"), false);
  });
});

describe("task views and migration", () => {
  it("shows due recurring tasks in today and all recurring plans in long-term", () => {
    const tasks = [dailyTask, weeklyTask, intervalTask];
    assert.equal(getVisibleTasks(tasks, { bucket: "today", dateKey: "2026-08-25" }).length, 2);
    assert.equal(getVisibleTasks(tasks, { bucket: "long-term", dateKey: "2026-08-25" }).length, 3);
  });

  it("normalizes legacy bucket tasks into scheduled templates", () => {
    const migratedToday = normalizeTask({ id: "legacy-today", title: "Legacy today", bucket: "today", completed: true }, "2026-08-25");
    const migratedLongTerm = normalizeTask({ id: "legacy-plan", title: "Legacy plan", bucket: "long-term", completed: false }, "2026-08-25");
    assert.deepEqual(migratedToday.schedule, { type: "once", date: "2026-08-25", startDate: "2026-08-25" });
    assert.deepEqual(migratedToday.completedDates, ["2026-08-25"]);
    assert.equal(migratedLongTerm.schedule.type, "weekly");
    assert.deepEqual(migratedLongTerm.schedule.weekdays, [2]);
  });
});

describe("theme colors", () => {
  it("accepts six-digit hex colors and falls back safely", () => {
    assert.equal(normalizeColor("#5b7cfa"), "#5b7cfa");
    assert.equal(normalizeColor("#ABCDEF"), "#abcdef");
    assert.equal(normalizeColor("blue"), "#0071e3");
  });
});
