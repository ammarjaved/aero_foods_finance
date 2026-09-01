-- =============================================================================
-- Daily / Weekly / Monthly — one-time tasks
-- Source: "Nisya Task To Do DWM.xlsx" sheets daily, weekly, monthly
-- Target: PostgreSQL  (run on aero_foods_finance)
--
-- Each row is a real task, created once and completed once.
-- There is no repeating template. New tasks are inserted when the user adds them
-- (or when a new day / week / month sheet is created).
-- =============================================================================

BEGIN;

-- If the old names already exist, rename them once.
ALTER TABLE IF EXISTS daily_task RENAME TO task_daily;
ALTER TABLE IF EXISTS weekly_task RENAME TO task_weekly;
ALTER TABLE IF EXISTS monthly_task RENAME TO task_monthly;
ALTER INDEX IF EXISTS idx_daily_task_date RENAME TO idx_task_daily_date;
ALTER INDEX IF EXISTS idx_weekly_task_week RENAME TO idx_task_weekly_week;
ALTER INDEX IF EXISTS idx_monthly_task_month RENAME TO idx_task_monthly_month;

-- ---------------------------------------------------------------------------
-- Daily  (Excel sheet "daily")
--   section:
--     daily_management  col A  Operations / Staff / Finance / Marketing / Customer
--     daily_everyday    col F  Daily Checklist (Every Day)
--     weekly_planner    col D  Mon–Sun business planner
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_daily (
    id              SERIAL PRIMARY KEY,
    task_date       DATE         NOT NULL,

    section         VARCHAR(40)  NOT NULL
                    CHECK (section IN (
                        'daily_management',
                        'daily_everyday',
                        'weekly_planner'
                    )),
    category        VARCHAR(60),           -- Operations, Staff, Finance, Marketing, Customer
    planner_group   VARCHAR(80),           -- e.g. 'Monday – Stock & Ordering'
    weekday         SMALLINT
                    CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 7),

    title           TEXT         NOT NULL,
    is_done         BOOLEAN      NOT NULL DEFAULT FALSE,
    done_at         TIMESTAMP,
    done_by         VARCHAR(80),
    remarks         TEXT,
    sort_order      INTEGER      NOT NULL DEFAULT 0,

    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_daily_date
    ON task_daily (task_date, section, sort_order);


-- ---------------------------------------------------------------------------
-- Weekly  (Excel sheet "weekly")
--   week_start = Monday of that week
--   category: Operations, Finance, HR, Business Development
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_weekly (
    id              SERIAL PRIMARY KEY,
    week_start      DATE         NOT NULL,

    category        VARCHAR(60)  NOT NULL,
    title           TEXT         NOT NULL,
    is_done         BOOLEAN      NOT NULL DEFAULT FALSE,
    done_at         TIMESTAMP,
    done_by         VARCHAR(80),
    remarks         TEXT,
    sort_order      INTEGER      NOT NULL DEFAULT 0,

    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_weekly_week
    ON task_weekly (week_start, category, sort_order);


-- ---------------------------------------------------------------------------
-- Monthly  (Excel sheet "monthly")
--   month_start = first day of that month
--   section:
--     monthly_management   col A  Operations / Finance / HR / Business Development
--     monthly_checklist    col I  Monthly Checklist
--     outstanding_project  Outstanding Projects (Mixue / Bakery / Ojim / HQ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_monthly (
    id              SERIAL PRIMARY KEY,
    month_start     DATE         NOT NULL,

    section         VARCHAR(40)  NOT NULL
                    CHECK (section IN (
                        'monthly_management',
                        'monthly_checklist',
                        'outstanding_project'
                    )),
    category        VARCHAR(60),           -- Ops/Finance/HR/BD or Mixue/Bakery/Ojim/HQ
    title           TEXT         NOT NULL,
    is_done         BOOLEAN      NOT NULL DEFAULT FALSE,
    done_at         TIMESTAMP,
    done_by         VARCHAR(80),
    remarks         TEXT,
    sort_order      INTEGER      NOT NULL DEFAULT 0,

    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_monthly_month
    ON task_monthly (month_start, section, sort_order);


-- ---------------------------------------------------------------------------
-- To Do  (user-created tasks from the "To Do" tab)
--   task_type: where the task appears — daily / weekly / monthly tab
--   category : the task shows under this category inside the matching tab
--   date_from / date_to: the task is visible on every day / week / month
--                          that overlaps this date range
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_todo (
    id              SERIAL PRIMARY KEY,
    task_type       VARCHAR(10)  NOT NULL
                    CHECK (task_type IN ('daily', 'weekly', 'monthly')),
    category        VARCHAR(60)  NOT NULL,
    title           TEXT         NOT NULL,
    date_from       DATE         NOT NULL,
    date_to         DATE         NOT NULL,

    is_done         BOOLEAN      NOT NULL DEFAULT FALSE,
    done_at         TIMESTAMP,
    done_by         VARCHAR(80),
    remarks         TEXT,
    sort_order      INTEGER      NOT NULL DEFAULT 0,

    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT task_todo_range_chk CHECK (date_to >= date_from)
);

CREATE INDEX IF NOT EXISTS idx_task_todo_type_range
    ON task_todo (task_type, date_from, date_to);

COMMIT;


-- Example: create one daily task for a specific date (not repeating)
-- INSERT INTO task_daily (task_date, section, category, title, sort_order)
-- VALUES ('2026-08-25', 'daily_management', 'Operations', 'All outlets open on time', 10);
