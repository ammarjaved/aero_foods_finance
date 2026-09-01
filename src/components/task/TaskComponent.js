import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { canEdit, VIEW_ONLY_MESSAGE } from "../../roles";

const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

const PLANNER_GROUPS = {
  1: "Monday – Stock & Ordering",
  2: "Tuesday – Operations",
  3: "Wednesday – Stock & Marketing",
  4: "Thursday – Finance & Administration",
  5: "Friday – Stock & Weekend Preparation",
  6: "Saturday – Peak Operations",
  7: "Sunday – Weekly Review",
};

const DAILY_CATEGORIES = [
  "Operations",
  "Staff",
  "Finance",
  "Marketing",
  "Customer",
];
const WEEKLY_CATEGORIES = [
  "Operations",
  "Finance",
  "HR",
  "Business Development",
];
const MONTHLY_MGMT_CATEGORIES = [
  "Operations",
  "Finance",
  "HR",
  "Business Development",
];
const PROJECT_CATEGORIES = ["Mixue", "Bakery", "Ojim", "HQ"];

function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

function formatYmd(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function todayStr() {
  return formatYmd(new Date());
}

function toMonday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const n = d.getDay();
  const diff = n === 0 ? -6 : 1 - n;
  d.setDate(d.getDate() + diff);
  return formatYmd(d);
}

function monthStartOf(dateStr) {
  return dateStr.slice(0, 7) + "-01";
}

function weekdayOf(dateStr) {
  const n = new Date(dateStr + "T00:00:00").getDay();
  return n === 0 ? 7 : n;
}

function currentUser() {
  return localStorage.getItem("user") || "";
}

function groupBy(list, keyFn) {
  const map = {};
  list.forEach((item) => {
    const key = keyFn(item) || "Other";
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });
  return map;
}

function TaskRow({ task, allowEdit, onToggle, onSaveTitle, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title || "");

  useEffect(() => {
    setTitle(task.title || "");
  }, [task.title]);

  const saveTitle = () => {
    setEditing(false);
    const next = title.trim();
    if (next && next !== task.title) {
      onSaveTitle(task, next);
    } else {
      setTitle(task.title || "");
    }
  };

  return (
    <div
      className="d-flex align-items-start py-1"
      style={{
        borderBottom: "1px solid #eee",
        opacity: task.is_done ? 0.65 : 1,
      }}
    >
      <input
        type="checkbox"
        className="mt-1 me-2"
        checked={!!task.is_done}
        disabled={!allowEdit}
        onChange={() => onToggle(task)}
        style={{ width: 18, height: 18 }}
      />
      {editing && allowEdit ? (
        <input
          className="form-control form-control-sm"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") {
              setTitle(task.title || "");
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          onClick={() => allowEdit && setEditing(true)}
          style={{
            textDecoration: task.is_done ? "line-through" : "none",
            cursor: allowEdit ? "pointer" : "default",
            flex: 1,
          }}
        >
          {task.title}
        </span>
      )}
      {onDelete && allowEdit && (
        <button
          className="btn btn-sm py-0 px-2 ms-1"
          style={{ color: "#e80000", fontWeight: "bold" }}
          title="Delete task"
          onClick={() => onDelete(task)}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div
      className="mb-3"
      style={{
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 6,
        padding: 12,
      }}
    >
      <h6
        style={{
          borderBottom: "2px solid #e80000",
          paddingBottom: 6,
          marginBottom: 10,
          fontWeight: "bold",
        }}
      >
        {title}
      </h6>
      {children}
    </div>
  );
}

function TaskComponent() {
  const allowEdit = canEdit();
  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [todoTasks, setTodoTasks] = useState([]);
  const [todoType, setTodoType] = useState("daily");
  const [todoCategory, setTodoCategory] = useState(DAILY_CATEGORIES[0]);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoFrom, setTodoFrom] = useState(todayStr());
  const [todoTo, setTodoTo] = useState(todayStr());

  const weekStart = toMonday(date);
  const monthStart = monthStartOf(date);
  const currentWeekday = weekdayOf(date);

  const endpoint = "business_planner.php";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      let url = API_BASE_URL + "/" + endpoint + "?type=" + tab + "&";
      if (tab === "daily") url += "date=" + date;
      if (tab === "weekly") url += "week_start=" + weekStart;
      if (tab === "monthly") url += "month_start=" + monthStart;
      const controller = new AbortController();
      const timer = setTimeout(function () {
        controller.abort();
      }, 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Failed to fetch tasks");
      }
      setTasks(json.data || []);
    } catch (e) {
      setTasks([]);
      if (e.name === "AbortError") {
        setError("Could not reach the API. Deploy business_planner.php to aero-foods and run task_schema.sql.");
      } else {
        setError(e.message || "Failed to fetch tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTodo = async () => {
    setLoading(true);
    setError("");
    try {
      const controller = new AbortController();
      const timer = setTimeout(function () {
        controller.abort();
      }, 12000);
      const res = await fetch(API_BASE_URL + "/" + endpoint + "?type=todo", {
        signal: controller.signal,
      });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Failed to fetch tasks");
      }
      setTodoTasks(json.data || []);
    } catch (e) {
      setTodoTasks([]);
      if (e.name === "AbortError") {
        setError("Could not reach the API. Deploy business_planner.php to aero-foods and create the task_todo table.");
      } else {
        setError(e.message || "Failed to fetch tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "todo") {
      loadTodo();
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, date]);

  const postJson = async (body) => {
    const res = await fetch(API_BASE_URL + "/" + endpoint + "?type=" + tab, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || json.status === "error") {
      throw new Error(json.message || "Save failed");
    }
    return json;
  };

  const toggleTask = async (task) => {
    if (!allowEdit) {
      alert(VIEW_ONLY_MESSAGE);
      return;
    }
    try {
      setSaving(true);
      await postJson({
        action: "update",
        id: task.id,
        is_done: !task.is_done,
        done_by: currentUser(),
        ...(task.source === "todo" ? { source: "todo" } : {}),
      });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async (task, title) => {
    if (!allowEdit) return;
    try {
      setSaving(true);
      await postJson({
        action: "update",
        id: task.id,
        title: title,
        ...(task.source === "todo" ? { source: "todo" } : {}),
      });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const todoCategories =
    todoType === "daily"
      ? DAILY_CATEGORIES
      : todoType === "weekly"
        ? WEEKLY_CATEGORIES
        : MONTHLY_MGMT_CATEGORIES;

  const addTodo = async () => {
    if (!allowEdit) {
      alert(VIEW_ONLY_MESSAGE);
      return;
    }
    if (!todoTitle.trim()) {
      alert("Please enter a task.");
      return;
    }
    if (!todoFrom || !todoTo) {
      alert("Please select From Date and To Date.");
      return;
    }
    if (todoTo < todoFrom) {
      alert("To Date must be on or after From Date.");
      return;
    }
    try {
      setSaving(true);
      await postJson({
        task_type: todoType,
        category: todoCategory,
        title: todoTitle.trim(),
        date_from: todoFrom,
        date_to: todoTo,
      });
      setTodoTitle("");
      await loadTodo();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTodo = async (task) => {
    if (!allowEdit) {
      alert(VIEW_ONLY_MESSAGE);
      return;
    }
    if (!window.confirm("Delete this task?")) return;
    try {
      setSaving(true);
      await postJson({ action: "delete", id: task.id });
      await loadTodo();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderTaskList = (list) => (
    <div>
      {list.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          allowEdit={allowEdit}
          onToggle={toggleTask}
          onSaveTitle={saveTitle}
        />
      ))}
    </div>
  );

  const dailyManagement = tasks.filter((t) => t.section === "daily_management");
  const dailyPlanner = tasks.filter((t) => t.section === "weekly_planner");
  const weeklyByCat = groupBy(tasks, (t) => t.category);
  const monthlyMgmt = tasks.filter((t) => t.section === "monthly_management");
  const monthlyCheck = tasks.filter((t) => t.section === "monthly_checklist");
  const monthlyProj = tasks.filter((t) => t.section === "outstanding_project");

  const tabBtn = (id, label) => (
    <button
      key={id}
      className="btn me-2"
      onClick={() => setTab(id)}
      style={{
        backgroundColor: tab === id ? "#e80000" : "#f3f3f3",
        color: tab === id ? "#fff" : "#333",
        fontWeight: tab === id ? "bold" : "normal",
        border: "1px solid " + (tab === id ? "#e80000" : "#ddd"),
      }}
    >
      {label}
    </button>
  );

  const shownTasks = tab === "todo" ? todoTasks : tasks;
  const doneCount = shownTasks.filter((t) => t.is_done).length;

  return (
    <div className="p-3" style={{ background: "#f6f6f6", minHeight: "100%" }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
        <h4 className="mb-2 mb-md-0" style={{ fontWeight: "bold" }}>
          Task Planner
        </h4>
        <div>
          {tabBtn("daily", "Daily")}
          {tabBtn("weekly", "Weekly")}
          {tabBtn("monthly", "Monthly")}
          {tabBtn("todo", "To Do")}
        </div>
      </div>

      <div
        className="d-flex flex-wrap align-items-end mb-3"
        style={{ gap: 12 }}
      >
        {tab === "daily" && (
          <div>
            <label className="form-label mb-1">Date</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}
        {tab === "weekly" && (
          <div>
            <label className="form-label mb-1">Week of (Monday)</label>
            <input
              type="date"
              className="form-control"
              value={weekStart}
              onChange={(e) => setDate(toMonday(e.target.value))}
            />
          </div>
        )}
        {tab === "monthly" && (
          <div>
            <label className="form-label mb-1">Month</label>
            <input
              type="month"
              className="form-control"
              value={date.slice(0, 7)}
              onChange={(e) => setDate(e.target.value + "-01")}
            />
          </div>
        )}
        <div className="text-muted" style={{ fontSize: 13 }}>
          {doneCount}/{shownTasks.length} done
          {saving ? " · saving..." : ""}
          {loading ? " · loading..." : ""}
        </div>
      </div>

      {!allowEdit && (
        <div className="alert alert-secondary py-2">{VIEW_ONLY_MESSAGE}</div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {tab === "daily" && (
        <div className="row">
          <div className="col-lg-6">
            <SectionCard title="Daily Management Checklist">
              {DAILY_CATEGORIES.map((cat) => (
                <div key={cat} className="mb-3">
                  <div style={{ fontWeight: 600, color: "#e80000" }}>{cat}</div>
                  {renderTaskList(
                    dailyManagement.filter((t) => t.category === cat),
                  )}
                </div>
              ))}
            </SectionCard>
          </div>
          <div className="col-lg-6">
            <SectionCard title="Daily Business Planner">
              <div className="mb-3">
                <div style={{ fontWeight: 600, color: "#e80000" }}>
                  {PLANNER_GROUPS[currentWeekday]}
                </div>
                {renderTaskList(
                  dailyPlanner.filter(
                    (t) =>
                      Number(t.weekday) === currentWeekday ||
                      t.planner_group === PLANNER_GROUPS[currentWeekday],
                  ),
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "weekly" && (
        <div className="row">
          {WEEKLY_CATEGORIES.map((cat) => (
            <div className="col-md-6 col-lg-3" key={cat}>
              <SectionCard title={cat}>
                {renderTaskList(weeklyByCat[cat] || [])}
              </SectionCard>
            </div>
          ))}
        </div>
      )}

      {tab === "monthly" && (
        <div className="row">
          <div className="col-lg-4">
            <SectionCard title="Monthly Management">
              {MONTHLY_MGMT_CATEGORIES.map((cat) => (
                <div key={cat} className="mb-3">
                  <div style={{ fontWeight: 600, color: "#e80000" }}>{cat}</div>
                  {renderTaskList(
                    monthlyMgmt.filter((t) => t.category === cat),
                  )}
                </div>
              ))}
            </SectionCard>
          </div>
          <div className="col-lg-4">
            <SectionCard title="Monthly Checklist">
              {renderTaskList(monthlyCheck)}
            </SectionCard>
          </div>
          <div className="col-lg-4">
            <SectionCard title="Outstanding Projects">
              {PROJECT_CATEGORIES.map((cat) => (
                <div key={cat} className="mb-3">
                  <div style={{ fontWeight: 600, color: "#e80000" }}>{cat}</div>
                  {renderTaskList(
                    monthlyProj.filter((t) => t.category === cat),
                  )}
                </div>
              ))}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "todo" && (
        <div>
          <SectionCard title="Create Task">
            <div className="row g-3 align-items-end">
              <div className="col-md-2 col-6">
                <label className="form-label mb-1">Type</label>
                <select
                  className="form-select"
                  value={todoType}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTodoType(next);
                    setTodoCategory(
                      next === "daily"
                        ? DAILY_CATEGORIES[0]
                        : next === "weekly"
                          ? WEEKLY_CATEGORIES[0]
                          : MONTHLY_MGMT_CATEGORIES[0],
                    );
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="col-md-3 col-6">
                <label className="form-label mb-1">Category</label>
                <select
                  className="form-select"
                  value={todoCategory}
                  onChange={(e) => setTodoCategory(e.target.value)}
                >
                  {todoCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 col-12">
                <label className="form-label mb-1">Task</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter task"
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTodo();
                  }}
                />
              </div>
              <div className="col-md-2 col-6">
                <label className="form-label mb-1">From Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={todoFrom}
                  onChange={(e) => setTodoFrom(e.target.value)}
                />
              </div>
              <div className="col-md-2 col-6">
                <label className="form-label mb-1">To Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={todoTo}
                  onChange={(e) => setTodoTo(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn mt-3"
              style={{
                backgroundColor: "#e80000",
                color: "#fff",
                fontWeight: "bold",
              }}
              onClick={addTodo}
              disabled={saving || !allowEdit}
            >
              + Add Task
            </button>
          </SectionCard>

          <div className="row">
            {["daily", "weekly", "monthly"].map((type) => {
              const list = todoTasks.filter((t) => t.task_type === type);
              if (list.length === 0) return null;
              const byCat = groupBy(list, (t) => t.category);
              return (
                <div className="col-lg-4" key={type}>
                  <SectionCard
                    title={
                      (type === "daily"
                        ? "Daily"
                        : type === "weekly"
                          ? "Weekly"
                          : "Monthly") + " Tasks"
                    }
                  >
                    {Object.keys(byCat)
                      .sort()
                      .map((cat) => (
                        <div key={cat} className="mb-3">
                          <div style={{ fontWeight: 600, color: "#e80000" }}>
                            {cat}
                          </div>
                          {byCat[cat].map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              allowEdit={allowEdit}
                              onToggle={toggleTask}
                              onSaveTitle={saveTitle}
                              onDelete={deleteTodo}
                            />
                          ))}
                        </div>
                      ))}
                  </SectionCard>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskComponent;
