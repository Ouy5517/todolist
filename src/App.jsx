import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarBlank,
  Check,
  CheckCircle,
  ListChecks,
  MagnifyingGlass,
  Hamburger,
  Palette,
  Plus,
  Repeat,
  TrashSimple,
  X,
} from "@phosphor-icons/react";
import {
  calculateProgress,
  getNextDueDate,
  getScheduleSummary,
  getVisibleTasks,
  getWeekday,
  isOccurrenceComplete,
  isTaskDueOnDate,
  normalizeColor,
  normalizeTask,
  toDateKey,
} from "./taskUtils.js";

const STORAGE_KEY = "quiet-list-tasks-v3";
const THEME_STORAGE_KEY = "quiet-list-theme-v1";
const PRESET_COLORS = [
  { name: "海蓝", value: "#0071e3" },
  { name: "紫罗兰", value: "#6b5ce7" },
  { name: "薄荷绿", value: "#1b9c78" },
  { name: "暖橙", value: "#d97706" },
  { name: "玫瑰", value: "#d84a79" },
];

function createSchedule(type, dateKey, weekdays = [getWeekday(dateKey)], intervalDays = 3) {
  if (type === "once") return { type, date: dateKey, startDate: dateKey };
  if (type === "weekly") return { type, startDate: dateKey, weekdays };
  if (type === "interval") return { type, startDate: dateKey, intervalDays: Math.max(1, Number(intervalDays) || 1) };
  return { type: "daily", startDate: dateKey };
}

function buildInitialTasks(todayKey) {
  return [
    { id: "today-brief", title: "Review project brief", detail: "Workspace · 20 min", schedule: createSchedule("once", todayKey), completedDates: [todayKey] },
    { id: "today-emails", title: "Reply to 3 emails", detail: "Inbox · 15 min", schedule: createSchedule("once", todayKey), completedDates: [todayKey] },
    { id: "today-dentist", title: "Book dentist appointment", detail: "Personal · 10 min", schedule: createSchedule("once", todayKey), completedDates: [todayKey] },
    { id: "today-next-week", title: "Plan next week", detail: "Planning · 30 min", schedule: createSchedule("once", todayKey), completedDates: [todayKey] },
    { id: "daily-pages", title: "Read 20 pages", detail: "Personal · 25 min", schedule: createSchedule("daily", todayKey), completedDates: [] },
    { id: "weekly-plants", title: "Water the plants", detail: "Home · 5 min", schedule: createSchedule("weekly", todayKey), completedDates: [] },
    { id: "interval-stretch", title: "Stretch for 10 minutes", detail: "Wellbeing · 10 min", schedule: createSchedule("interval", todayKey, [], 3), completedDates: [] },
    { id: "weekly-goals", title: "Plan quarterly goals", detail: "Long-term · This month", schedule: { type: "weekly", startDate: todayKey, weekdays: [1] }, completedDates: [] },
    { id: "weekly-portfolio", title: "Refresh portfolio case study", detail: "Long-term · This quarter", schedule: { type: "weekly", startDate: todayKey, weekdays: [3] }, completedDates: [] },
    { id: "interval-trip", title: "Sketch the next trip", detail: "Long-term · Someday", schedule: createSchedule("interval", todayKey, [], 14), completedDates: [] },
    { id: "weekly-course", title: "Finish the design course", detail: "Long-term · This quarter", schedule: { type: "weekly", startDate: todayKey, weekdays: [7] }, completedDates: [] },
    { id: "interval-photos", title: "Organize photo archive", detail: "Long-term · Someday", schedule: createSchedule("interval", todayKey, [], 7), completedDates: [] },
  ];
}

const NAV_ITEMS = [
  { id: "today", label: "今日", english: "Today", icon: CalendarBlank },
  { id: "long-term", label: "长期计划", english: "Long-term", icon: Archive },
  { id: "all", label: "全部任务", english: "All tasks", icon: ListChecks },
  { id: "completed", label: "已完成", english: "Completed", icon: CheckCircle },
];

const VIEW_COPY = {
  today: { eyebrow: "TODAY / 今天", title: "Good morning", subtitle: "Focus on what matters.", helper: "今天要做 / Today" },
  "long-term": { eyebrow: "LONG-TERM / 长期", title: "Make room for the future.", subtitle: "Plans become progress when they have a next date.", helper: "长期计划 / Long-term" },
  all: { eyebrow: "ALL TASKS / 全部", title: "Everything in one place.", subtitle: "A clear list makes progress visible.", helper: "全部任务 / All tasks" },
  completed: { eyebrow: "COMPLETED / 已完成", title: "A little lighter.", subtitle: "Look at what you have already done.", helper: "已完成 / Completed" },
};

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "active", label: "待完成" },
  { id: "done", label: "已完成" },
];

const SCHEDULE_OPTIONS = [
  { id: "once", label: "一次性", hint: "指定一个日期" },
  { id: "daily", label: "每天", hint: "每日自动出现" },
  { id: "weekly", label: "每周", hint: "选择星期几" },
  { id: "interval", label: "每隔几天", hint: "按间隔重复" },
];

function getComposerDefaults(todayKey, activeView, title = "") {
  return {
    title,
    type: activeView === "long-term" ? "weekly" : "once",
    date: todayKey,
    weekdays: [getWeekday(todayKey)],
    intervalDays: 3,
  };
}

function loadTasks() {
  const todayKey = toDateKey();
  try {
    const storedTasks = window.localStorage.getItem(STORAGE_KEY);
    return storedTasks ? JSON.parse(storedTasks).map((task) => normalizeTask(task, todayKey)) : buildInitialTasks(todayKey);
  } catch {
    return buildInitialTasks(todayKey);
  }
}

function loadThemeColor() {
  try {
    return normalizeColor(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return PRESET_COLORS[0].value;
  }
}

function formatCount(count) {
  return `${count} ${count === 1 ? "task" : "tasks"}`;
}

function formatNextDate(dateKey, todayKey) {
  if (!dateKey) return "暂无日期";
  if (dateKey === todayKey) return "今天";
  return dateKey;
}

function formatDisplayDate(dateKey) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${dateKey}T00:00:00Z`));
}

function ProgressRing({ value }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="progress-ring" aria-label={`${value}% complete`}>
      <svg viewBox="0 0 180 180" role="img" aria-hidden="true">
        <circle className="ring-track" cx="90" cy="90" r={radius} />
        <circle className="ring-value" cx="90" cy="90" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="ring-label">{value}<small>%</small></span>
    </div>
  );
}

function TaskRow({ task, todayKey, isPlan, onToggle, onDelete }) {
  const dueToday = isTaskDueOnDate(task, todayKey);
  const completed = isOccurrenceComplete(task, todayKey);
  const isLocked = isPlan && !dueToday;
  const nextDate = getNextDueDate(task, todayKey);
  const detail = isPlan
    ? `${getScheduleSummary(task)} · 下一次：${formatNextDate(nextDate, todayKey)}`
    : task.detail;

  return (
    <li className={`task-row ${completed ? "is-complete" : ""} ${isLocked ? "is-locked" : ""}`}>
      <button
        className={`task-check ${completed ? "is-checked" : ""}`}
        type="button"
        disabled={isLocked}
        onClick={() => onToggle(task.id)}
        aria-label={isLocked ? `${task.title} 尚未到执行日期` : completed ? `标记 ${task.title} 为未完成` : `标记 ${task.title} 为完成`}
      >
        {completed ? <Check size={17} weight="bold" /> : null}
      </button>
      <div className="task-copy">
        <span className="task-title">{task.title}</span>
        <span className="task-detail">{detail}</span>
      </div>
      <button className="task-delete" type="button" onClick={() => onDelete(task.id)} aria-label={`删除 ${task.title}`}>
        <TrashSimple size={17} weight="regular" />
      </button>
    </li>
  );
}

function TaskGroup({ title, tasks, todayKey, isPlan, onToggle, onDelete }) {
  if (!tasks.length) return null;
  return (
    <section className="task-group" aria-labelledby={`${title}-heading`}>
      <div className="group-heading">
        <h2 id={`${title}-heading`}>{title}</h2>
        <span>{formatCount(tasks.length)}</span>
      </div>
      <ul className="task-list">
        {tasks.map((task) => <TaskRow key={task.id} task={task} todayKey={todayKey} isPlan={isPlan} onToggle={onToggle} onDelete={onDelete} />)}
      </ul>
    </section>
  );
}

function TaskComposer({ value, onChange, onClose, onSubmit }) {
  function updateField(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  function toggleWeekday(day) {
    const weekdays = value.weekdays.includes(day)
      ? value.weekdays.filter((item) => item !== day)
      : [...value.weekdays, day].sort((a, b) => a - b);
    onChange({ ...value, weekdays: weekdays.length ? weekdays : [day] });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="task-composer" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <div className="composer-header">
          <div><p className="eyebrow">NEW PLAN / 新任务</p><h2 id="composer-title">给任务一个节奏</h2><p>它会在该执行的日子出现在“今日”。</p></div>
          <button className="composer-close" type="button" onClick={onClose} aria-label="关闭任务设置"><X size={19} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <label className="field-label" htmlFor="composer-task-title">任务名称</label>
          <input id="composer-task-title" className="composer-input" value={value.title} onChange={(event) => updateField("title", event.target.value)} placeholder="例如：每周整理周报" autoFocus />

          <fieldset className="schedule-fieldset">
            <legend className="field-label">重复方式</legend>
            <div className="schedule-options">
              {SCHEDULE_OPTIONS.map((option) => <button key={option.id} className={`schedule-option ${value.type === option.id ? "is-active" : ""}`} type="button" onClick={() => updateField("type", option.id)}><Repeat size={17} /><span><strong>{option.label}</strong><small>{option.hint}</small></span></button>)}
            </div>
          </fieldset>

          <div className="schedule-date-row">
            <label className="field-label" htmlFor="composer-date">{value.type === "once" ? "执行日期" : "开始日期"}</label>
            <input id="composer-date" className="composer-input" type="date" value={value.date} onChange={(event) => updateField("date", event.target.value)} required />
          </div>

          {value.type === "weekly" ? <fieldset className="weekday-fieldset"><legend className="field-label">每周执行日</legend><div className="weekday-options">{[1, 2, 3, 4, 5, 6, 7].map((day) => <button key={day} className={value.weekdays.includes(day) ? "is-active" : ""} type="button" onClick={() => toggleWeekday(day)}>{["一", "二", "三", "四", "五", "六", "日"][day - 1]}</button>)}</div></fieldset> : null}
          {value.type === "interval" ? <label className="interval-field"><span className="field-label">每隔几天</span><span className="interval-input"><input type="number" min="1" step="1" value={value.intervalDays} onChange={(event) => updateField("intervalDays", event.target.value)} /><span>天</span></span></label> : null}

          <div className="composer-actions"><button className="button-secondary" type="button" onClick={onClose}>取消</button><button className="button-primary" type="submit" disabled={!value.title.trim()}>保存任务</button></div>
        </form>
      </section>
    </div>
  );
}

function PalettePopover({ value, onChange, onClose }) {
  return (
    <section className="palette-popover" aria-label="调色盘">
      <div className="palette-heading"><strong>调色盘</strong><button type="button" onClick={onClose}>完成</button></div>
      <p>选择一个舒服的强调色。</p>
      <div className="palette-swatches">
        {PRESET_COLORS.map((color) => <button key={color.value} className={`palette-swatch ${value === color.value ? "is-active" : ""}`} type="button" style={{ "--swatch": color.value }} onClick={() => onChange(color.value)} aria-label={`使用${color.name}`} aria-pressed={value === color.value}><span /></button>)}
      </div>
      <label className="custom-color"><span>自定义颜色</span><input type="color" value={value} onChange={(event) => onChange(normalizeColor(event.target.value))} aria-label="自定义颜色" /></label>
    </section>
  );
}

export function App() {
  const todayKey = toDateKey();
  const [tasks, setTasks] = useState(loadTasks);
  const [themeColor, setThemeColor] = useState(loadThemeColor);
  const [activeView, setActiveView] = useState("today");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composer, setComposer] = useState(() => getComposerDefaults(todayKey, "today"));

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => {
    document.documentElement.style.setProperty("--blue", themeColor);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeColor);
  }, [themeColor]);

  const currentCopy = VIEW_COPY[activeView];
  const visibleTasks = useMemo(() => getVisibleTasks(tasks, { bucket: activeView, filter, query: search, dateKey: todayKey }), [activeView, filter, search, tasks, todayKey]);
  const dailyTasks = useMemo(() => getVisibleTasks(tasks, { bucket: "today", dateKey: todayKey }), [tasks, todayKey]);
  const dailyProgress = calculateProgress(tasks, "today", todayKey);
  const dailyCompletedCount = dailyTasks.filter((task) => isOccurrenceComplete(task, todayKey)).length;
  const activeTodayCount = dailyTasks.filter((task) => !isOccurrenceComplete(task, todayKey)).length;
  const activeLongTermCount = tasks.filter((task) => task.schedule?.type !== "once" && !isOccurrenceComplete(task, todayKey)).length;
  const completedCount = visibleTasks.filter((task) => isOccurrenceComplete(task, todayKey)).length;

  const groupedTasks = useMemo(() => {
    if (activeView === "today") return [{ title: "今天要做 / Today", tasks: visibleTasks, isPlan: false }];
    if (activeView === "long-term") return [{ title: "长期计划 / Long-term", tasks: visibleTasks, isPlan: true }];
    return [{ title: currentCopy.helper, tasks: visibleTasks, isPlan: true }];
  }, [activeView, currentCopy.helper, visibleTasks]);

  function toggleOccurrence(taskId) {
    setTasks((currentTasks) => currentTasks.map((task) => {
      if (task.id !== taskId) return task;
      const completionSet = new Set(task.completedDates || []);
      if (completionSet.has(todayKey)) completionSet.delete(todayKey);
      else completionSet.add(todayKey);
      return { ...task, completedDates: [...completionSet].sort() };
    }));
  }

  function deleteTask(taskId) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  }

  function addTask(title, schedule) {
    setTasks((currentTasks) => [{ id: `task-${Date.now()}`, title, detail: schedule.type === "once" ? "Today · Just added" : "Plan · Just added", schedule, completedDates: [] }, ...currentTasks]);
  }

  function quickAddTask(event) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const type = activeView === "long-term" ? "weekly" : "once";
    addTask(title, createSchedule(type, todayKey, [getWeekday(todayKey)]));
    setDraft("");
  }

  function openComposer() {
    setComposer(getComposerDefaults(todayKey, activeView, draft.trim()));
    setIsComposerOpen(true);
  }

  function submitComposer(event) {
    event.preventDefault();
    const title = composer.title.trim();
    if (!title) return;
    addTask(title, createSchedule(composer.type, composer.date, composer.weekdays, composer.intervalDays));
    setDraft("");
    setIsComposerOpen(false);
  }

  function changeView(viewId) {
    setActiveView(viewId);
    setFilter("all");
    setSearch("");
    setIsSearchOpen(false);
    setIsSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => changeView("today")} aria-label="回到今日任务"><span className="brand-mark" aria-hidden="true" /><span>Quiet List</span></button>
        <div className="topbar-actions">
          <button className="icon-button" type="button" onClick={() => setIsPaletteOpen((open) => !open)} aria-label="打开调色盘" aria-expanded={isPaletteOpen}><Palette size={19} /></button>
          {isSearchOpen ? <label className="search-field"><MagnifyingGlass size={17} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索任务" aria-label="搜索任务" /><button type="button" onClick={() => { setSearch(""); setIsSearchOpen(false); }} aria-label="关闭搜索"><X size={17} /></button></label> : <button className="icon-button" type="button" onClick={() => setIsSearchOpen(true)} aria-label="搜索任务"><MagnifyingGlass size={19} /></button>}
          <button className="menu-button" type="button" onClick={() => setIsSidebarOpen((open) => !open)} aria-label="打开导航"><Hamburger size={22} /></button>
        </div>
      </header>

      {isPaletteOpen ? <PalettePopover value={themeColor} onChange={setThemeColor} onClose={() => setIsPaletteOpen(false)} /> : null}

      <div className="workspace">
        <aside className={`sidebar ${isSidebarOpen ? "is-open" : ""}`}>
          <div className="sidebar-intro"><span className="sidebar-kicker">YOUR SPACE</span><span className="sidebar-date">{formatDisplayDate(todayKey)}</span></div>
          <nav aria-label="任务列表">
            {NAV_ITEMS.map(({ id, label, english, icon: Icon }) => {
              const count = id === "today" ? activeTodayCount : id === "long-term" ? activeLongTermCount : id === "completed" ? tasks.filter((task) => task.completedDates?.length).length : tasks.length;
              return <button className={`nav-item ${activeView === id ? "is-active" : ""}`} type="button" key={id} onClick={() => changeView(id)}><Icon size={20} weight={activeView === id ? "fill" : "regular"} /><span className="nav-label"><strong>{label}</strong><small>{english}</small></span><span className="nav-count">{count}</span></button>;
            })}
          </nav>
          <div className="sidebar-footer"><div className="sidebar-mini-stat"><span>Due today</span><strong>{activeTodayCount}</strong></div><p>Plans become progress.</p></div>
        </aside>

        <main className="main-content">
          <div className="content-header"><div><p className="eyebrow">{currentCopy.eyebrow}</p><h1>{currentCopy.title}</h1><p className="subtitle">{currentCopy.subtitle}</p></div><div className="view-meta"><span>{formatCount(visibleTasks.length)}</span><span className="meta-dot" aria-hidden="true" /><span>{completedCount} done</span></div></div>
          <form className="add-task-form" onSubmit={quickAddTask}><Plus size={20} weight="regular" /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={activeView === "long-term" ? "Add a recurring plan…" : "Add a new task…"} aria-label="添加新任务" /><button className="schedule-trigger" type="button" onClick={openComposer} aria-label="设置日期和重复"><CalendarBlank size={18} /></button><button type="submit" aria-label="添加任务" disabled={!draft.trim()}><Plus size={19} weight="bold" /></button></form>
          <div className="list-toolbar"><div className="filter-tabs" aria-label="筛选任务">{FILTERS.map((item) => <button key={item.id} className={filter === item.id ? "is-active" : ""} type="button" onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><span className="list-hint">点击左侧勾选框即可更新进度</span></div>
          <div className="task-groups">
            {groupedTasks.length ? groupedTasks.map((group) => <TaskGroup key={group.title} title={group.title} tasks={group.tasks} todayKey={todayKey} isPlan={group.isPlan} onToggle={toggleOccurrence} onDelete={deleteTask} />) : <div className="empty-state"><CheckCircle size={34} weight="thin" /><strong>{search ? "没有匹配的任务" : "这里还没有任务"}</strong><span>{search ? "换一个关键词试试。" : "把一件小事写下来，开始今天。"}</span></div>}
          </div>
        </main>

        <aside className="progress-pane">
          <div className="progress-topline"><span>DAILY COMPLETION</span><span>Today</span></div>
          <ProgressRing value={dailyProgress} />
          <div className="progress-copy"><strong>{dailyCompletedCount} of {dailyTasks.length} tasks complete</strong><span>{activeTodayCount} to go</span></div>
          <div className="progress-note"><span className="note-line" aria-hidden="true" /><p>Every plan gets its day.</p></div>
          <div className="progress-breakdown"><div><span>Due today</span><strong>{dailyTasks.length}</strong></div><div><span>Long-term plans</span><strong>{tasks.filter((task) => task.schedule?.type !== "once").length}</strong></div></div>
        </aside>
      </div>

      {isComposerOpen ? <TaskComposer value={composer} onChange={setComposer} onClose={() => setIsComposerOpen(false)} onSubmit={submitComposer} /> : null}
    </div>
  );
}
