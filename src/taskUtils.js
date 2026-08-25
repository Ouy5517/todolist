const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeColor(value, fallback = "#0071e3") {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function dateDifferenceInDays(startDateKey, endDateKey) {
  return Math.round((parseDateKey(endDateKey) - parseDateKey(startDateKey)) / DAY_MS);
}

export function toDateKey(date = new Date()) {
  if (typeof date === "string") return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekday(dateKey) {
  const sundayBasedDay = parseDateKey(dateKey).getUTCDay();
  return sundayBasedDay === 0 ? 7 : sundayBasedDay;
}

export function normalizeTask(task, currentDateKey) {
  if (task.schedule?.type) {
    const schedule = {
      ...task.schedule,
      startDate: task.schedule.startDate || task.schedule.date || currentDateKey,
      weekdays: task.schedule.type === "weekly" && task.schedule.weekdays?.length
        ? task.schedule.weekdays
        : task.schedule.type === "weekly"
          ? [getWeekday(currentDateKey)]
          : task.schedule.weekdays,
      intervalDays: task.schedule.type === "interval" ? Math.max(1, Number(task.schedule.intervalDays) || 1) : task.schedule.intervalDays,
    };

    return {
      ...task,
      detail: task.detail || "Personal · Just added",
      completedDates: Array.isArray(task.completedDates) ? task.completedDates : [],
      schedule,
    };
  }

  const isLongTerm = task.bucket === "long-term";
  return {
    id: task.id,
    title: task.title,
    detail: task.detail || (isLongTerm ? "Long-term · Planned" : "Today · Planned"),
    schedule: isLongTerm
      ? { type: "weekly", startDate: currentDateKey, weekdays: [getWeekday(currentDateKey)] }
      : { type: "once", date: currentDateKey, startDate: currentDateKey },
    completedDates: task.completed ? [currentDateKey] : [],
  };
}

export function isTaskDueOnDate(task, dateKey) {
  const schedule = task.schedule;
  if (!schedule) return false;

  const startDate = schedule.startDate || schedule.date;
  if (startDate && dateKey < startDate) return false;

  if (schedule.type === "once") return schedule.date === dateKey;
  if (schedule.type === "daily") return true;
  if (schedule.type === "weekly") return (schedule.weekdays || []).includes(getWeekday(dateKey));
  if (schedule.type === "interval") {
    const intervalDays = Math.max(1, Number(schedule.intervalDays) || 1);
    return dateDifferenceInDays(startDate, dateKey) % intervalDays === 0;
  }

  return false;
}

export function isOccurrenceComplete(task, dateKey) {
  return Array.isArray(task.completedDates) && task.completedDates.includes(dateKey);
}

export function getNextDueDate(task, fromDateKey) {
  const startDate = task.schedule?.startDate || task.schedule?.date || fromDateKey;
  const firstDate = startDate > fromDateKey ? startDate : fromDateKey;
  if (task.schedule?.type === "once") return task.schedule.date >= fromDateKey ? task.schedule.date : null;

  for (let offset = 0; offset <= 3660; offset += 1) {
    const candidate = addDays(firstDate, offset);
    if (isTaskDueOnDate(task, candidate)) return candidate;
  }

  return null;
}

export function getScheduleSummary(task) {
  const schedule = task.schedule;
  if (!schedule) return "未设置日期";
  if (schedule.type === "once") return `一次性 · ${schedule.date}`;
  if (schedule.type === "daily") return "每天执行";
  if (schedule.type === "weekly") {
    const labels = ["一", "二", "三", "四", "五", "六", "日"];
    return `每周${(schedule.weekdays || []).sort((a, b) => a - b).map((day) => labels[day - 1]).join("、")}`;
  }
  if (schedule.type === "interval") return `每隔 ${Math.max(1, Number(schedule.intervalDays) || 1)} 天`;
  return "未设置日期";
}

function getScopedTasks(tasks, bucket, dateKey) {
  if (bucket === "today") return tasks.filter((task) => isTaskDueOnDate(task, dateKey));
  if (bucket === "long-term") return tasks.filter((task) => task.schedule?.type !== "once");
  if (bucket === "completed") return tasks.filter((task) => task.completedDates?.length);
  return tasks;
}

export function getVisibleTasks(tasks, { bucket = "all", filter = "all", query = "", dateKey = toDateKey() } = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  return getScopedTasks(tasks, bucket, dateKey).filter((task) => {
    const completed = bucket === "today" || bucket === "long-term"
      ? isOccurrenceComplete(task, dateKey)
      : Boolean(task.completedDates?.length);
    const matchesFilter = filter === "active" ? !completed : filter === "done" ? completed : true;
    const matchesQuery = normalizedQuery
      ? `${task.title} ${task.detail || ""} ${getScheduleSummary(task)}`.toLowerCase().includes(normalizedQuery)
      : true;

    return matchesFilter && matchesQuery;
  });
}

export function calculateProgress(tasks, bucket = "today", dateKey = toDateKey()) {
  const scopedTasks = getScopedTasks(tasks, bucket, dateKey);
  if (!scopedTasks.length) return 0;

  const completedTasks = scopedTasks.filter((task) =>
    bucket === "today" || bucket === "long-term"
      ? isOccurrenceComplete(task, dateKey)
      : Boolean(task.completedDates?.length),
  ).length;
  return Math.round((completedTasks / scopedTasks.length) * 100);
}
