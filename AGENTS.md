# AGENTS.md

Guidance for AI agents working in the **aero_foods_finance** repository — a multi-company
F&B finance/accounting web app (React SPA + PHP API + PostgreSQL), with an optional
Python AI stock-prediction microservice.

---

## 1. Essential commands

This is a **Create React App** (JavaScript, not TypeScript) project. The frontend is the
part that builds/tests; the PHP files are deployed as-is to a web server and are not part
of any build pipeline here.

```bash
npm install        # install frontend dependencies
npm start          # dev server at http://localhost:3000 (hot reload)
npm run build      # production build -> ./build/ (deploy this folder)
npm test           # CRA test runner (no real tests currently exist)
```

There is no lint script configured beyond CRA defaults, no CI config, no Makefile. The
Python service in `agentic/` has its own setup (see §6).

**Build/deploy note:** `package.json` sets `"homepage": "/aero_foods_finance"` and
`App.js` uses `<BrowserRouter basename="/aero_foods_finance">`, so the app is served from
the `/aero_foods_finance` sub-path. Do not change either without updating the other.

---

## 2. High-level architecture

```
React SPA (src/)  ──HTTP/JSON──>  PHP API (aero-foods/*.php)  ──SQL──>  PostgreSQL
   (port 3000 dev)                   (deployed separately)               (192.168.1.34:5432)
        │
        └──(optional)──>  Python FastAPI (agentic/)  ──>  same PostgreSQL
```

- **Frontend** (`src/`): React 18 + react-router-dom v7. Talks to the PHP API via `fetch`.
- **Backend** (`aero-foods/*.php`): Plain PHP scripts, one endpoint per file. Each returns
  JSON. No framework, no Composer, no autoload — each script opens its own DB connection.
- **Database**: PostgreSQL. **Each company is its own database** (see §3).
- **AI service** (`agentic/`): Standalone FastAPI app (Strands + OpenAI) for inventory
  prediction, reached through a PHP bridge (`stockbot_api.php`). Independent of the main app.

> ⚠️ Only the `aero-foods/` PHP folder lives in this repo. The per-company PHP backends
> (`abe-yus/`, `amazon-cafe/`, `amazon-cafe-lyp/`, `ojim-cafe/`, `mixue-sogo/`) are
> **deployed separately and not version-controlled here**. They are near-copies of
> `aero-foods/`. If you need to change backend behavior for a company, change it in
> `aero-foods/` as the reference and assume the deployed copies need the same change.

---

## 3. The multi-company model — READ THIS FIRST

The single most important (and non-obvious) thing: the app manages **6 outlets**, and each
outlet appears in **three different places with three different naming schemes**. Getting
these straight is essential before touching almost any file.

| Outlet (UI label)         | Frontend folder        | PHP backend path      | PostgreSQL database     |
|---------------------------|------------------------|-----------------------|-------------------------|
| Mixue (Jakel) — *default* | `src/components/`      | `/aero-foods`         | `aero_foods_finance`    |
| Abe Yus                   | `src/com_abe/`         | `/abe-yus`            | `abe_yus_finance`       |
| D' Amazon Cafe            | `src/com_amz/`         | `/amazon-cafe`        | `amazon_cafe_finance`   |
| D' Amazon Cafe LYP        | `src/com_amz_lyp/`     | `/amazon-cafe-lyp`    | `amazon_cafe_finance_lyp`|
| Ojim Cafe                 | `src/ojim/`            | `/ojim-cafe`          | `ojim_finance`          |
| Mixue Sogo                | `src/com_mixue_sogo/`  | `/mixue-sogo`         | `mixue_sogo`            |

Consequences / conventions:

- **The frontend is duplicated per company.** `src/components/` is the canonical/default
  outlet, and `src/com_abe/`, `src/com_amz/`, `src/com_amz_lyp/`, `src/ojim/`,
  `src/com_mixue_sogo/` each contain a **near-identical copy** of the same feature folders
  (`daily-sheet/`, `expense/`, `wastage/`, `bank-reconciliation/`, `materials/`,
  `stock-in/`, `time-sheet-*/`). The *only* meaningful difference between the copies is the
  hardcoded `API_BASE_URL` and small label/title tweaks. When fixing a bug or adding a
  feature, you almost always must apply it across **all** sibling folders, not just one.
- **`App.js` wires every outlet explicitly.** Each feature has 6 routes
  (e.g. `/dashboard`, `/dashboard-yus`, `/dashboard-amz`, `/dashboard-amz-lyp`,
  `/dashboard-ojim`, `/dashboard-mixue-sogo`) each importing from the matching folder.
  Adding a new feature means adding all the routes + imports.
- **Sidebar (`src/Sidebar.js`)** defines one `menuItems_*` array per outlet and groups them
  into collapsible sections. Add new pages here too.
- **Cross-company endpoints use a `db=` query parameter.** Summary/reporting endpoints
  (`mss.php`, `timesheet_sb.php`, `reconsole.php`, `mon-sum-mixiue*.php` with a `db` param)
  accept `?db=<database_name>` to pick which company's database to query. Per-outlet
  endpoints instead live under that outlet's PHP folder and hardcode their own DB.
- The summary UI lists a `combined` / "Combined All Cafe" option that aggregates all six
  databases client-side — it is not a real database.

---

## 4. Frontend patterns & conventions

- **Stack:** React function components + Hooks (`useState`, `useEffect`). react-bootstrap
  + plain Bootstrap 5 for most layout, but **MUI** (`@mui/material`) is also used (notably
  the login screen), and many components mix in **Tailwind utility class names** and heavy
  inline `style={{...}}`. Styling is intentionally inconsistent — match the surrounding
  file rather than imposing one system.
- **Each feature = a folder** containing `FormComponent.js` (input form), `table.js`
  (data table), a container component (e.g. `Dashboard.js`, `Expense.js`), and a
  `Component.js` wrapper. The container usually holds `API_BASE_URL` and the fetch logic.
- **Data fetching** is raw `fetch()` with no shared client, no auth headers, and no error
  abstraction. Example shape:
  ```js
  const API_BASE_URL = "http://121.121.232.54:88/aero-foods"; // only this line differs per outlet
  fetch(`${API_BASE_URL}/fetchData.php?month=${m}&year=${y}`).then(r => r.json())
  ```
- **Auth:** `LoginForm.js` POSTs to `.../login-web.php`. On success it stores a token in
  `localStorage`. `Sidebar.js` guards pages by checking `localStorage.getItem('token')`
  and reads `localStorage.getItem('user')` — **only the username `"admin"` is treated as
  admin** (`setIsAdmin(user === "admin")`). There is no role table.
- **Number formatting** uses `Intl.NumberFormat('en-US', {minimumFractionDigits:2,
  maximumFractionDigits:2})` — there is a shared helper pattern in `Landing.js`.

### Gotchas
- **Known bug — token case mismatch.** `login-web.php` returns `{"token": ...}` (lowercase)
  but `LoginForm.js:96` reads `data.Token` (capital T) and stores `undefined`. If auth
  behaves oddly, this is why. Do not "fix" it blindly — the whole app relies on the
  current (loose) behavior; coordinate any auth change carefully.
- **`API_BASE_URL` and the `121.121.232.54:88` host are hardcoded in ~100 files.** There is
  no central config / env var for the API host (except the optional StockBot URL, which uses
  `REACT_APP_STOCKBOT_API_URL`). Changing the host means editing each call site.
- **Files suffixed `-` or `--` are backups/older versions** (e.g. `table-.js`,
  `TableBankReconciliation--.js`, `ExpenseFormComponent-.js`, `daily_sheet--.php`,
  `mon-sum-mixiue2.php` …`mon-sum-mixiue6.php`). The active file is the one **without** the
  suffix. Don't edit the suffixed copies and don't import them.
- A few components are named with typos that are load-bearing: `StickInDash.js`
  (should be "StockIn") and the folder `timeshete-analysis/` (should be "timesheet"). Keep
  the existing spelling in imports.

---

## 5. Backend (PHP) patterns & conventions

- **One endpoint per file.** A script typically: sets CORS headers (`Access-Control-Allow-Origin: *`),
  opens a PDO (or occasionally `pg_connect`) connection, runs a query, `echo json_encode(...)`.
- **Two connection styles coexist:**
  - `connection.php` — a `Connection` class using procedural `pg_connect()` (used by `login.php`).
  - Most other scripts — inline `new PDO("pgsql:host=...;dbname=...")` created at the top of the file.
- **DB credentials are hardcoded** in nearly every PHP file: host `192.168.1.34`, user
  `postgres`, password `Admin123`. Scripts that take `?db=` read the DB name from the query
  string; the rest hardcode `aero_foods_finance`.
- **CORS is wide open** (`*`) on all endpoints — this is by design for the dev deployment.
- **SQL is built by string interpolation in many files** (`"... WHERE month = $m ..."`),
  including user input (`$_GET['db']`, `$_GET['month']`, etc.). `daily_sheet.php` is one of
  the better examples using PDO `prepare`/`bindParam`; prefer that pattern for new code.
  `login.php` and `login-web.php` interpolate `$username`/`$password` directly — avoid
  copying that pattern.
- **File uploads** (e.g. `daily_sheet.php`, `uploadImages.php`) save to an `images/`
  subfolder with a `uniqid()_YYYYMMDD.ext` filename and store the relative path in the DB.
  These image directories are gitignored / stored on the server only.

### Gotchas
- `reconsole.php` and the `mon-sum-mixiueN.php` series are heavy month-end
  aggregation/recalculation scripts driven by the `ReCalculate` UI. They take `year`, `db`,
  and `user` params and rewrite summary figures. Treat changes here as high-risk.
- `del.php`, `del1.php`, `del2.php`, `del_stock.php`, `delete_*.php` are destructive
  delete endpoints — read carefully before modifying.

---

## 6. The `agentic/` Python service (StockBot)

A **separate, optional** FastAPI microservice for inventory prediction. Not part of the
React/PHP build. See `agentic/README.md` for the full architecture.

```bash
cd agentic
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # fill DB creds + OPENAI_API_KEY + FRONTEND_URL
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload   # start API
python stock_agent.py             # CLI test of the agent
```

- Connects to the **same PostgreSQL** as the PHP layer (tables `stock_left`,
  `stock_in_transaction`).
- Reached by the React app via the PHP bridge `stockbot_api.php` → Python `/chat`.
- Per-user memory keyed by a `session_id` stored in browser `localStorage` (60-min idle
  expiry). Each session gets its own agent instance.
- The React entry point is `src/components/summary/StockBotChat.js`; its API URL comes from
  `process.env.REACT_APP_STOCKBOT_API_URL` (falls back to localhost).

---

## 7. Database schema (inferred, no migrations checked in)

There are **no schema/migration files** in the repo. Tables referenced across the code
include (non-exhaustive): `users`, `daily_sheet`, `bank_reconciliation_sheet`,
`daily_expenditure`, `daily_wastage`, `log_sheet` (timesheets), `materials`,
`stock_left`, `stock_in_transaction`, `salary`, audit tables, and SDS expenditure tables.
When you need a column's exact definition, check the PHP query that reads/writes it rather
than guessing.

The `daily_sheet` row is the central record and carries many computed/denormalized fields
(`total_sales`, `avg_transaction_value`, `variance`, `cash_box_amount`, image paths, etc.)
that the form both reads and writes.

---

## 8. Repository housekeeping

- **No existing rule files** (`.cursorrules`, `.github/copilot-instructions.md`, `claude.md`,
  etc.) were present — this `AGENTS.md` is the first.
- **Git branch:** work happens on `ai` (and `main`-style commits go under "changes added").
- `.gitignore` excludes `node_modules/`, `build/`, `.env*`, `*.xlsx/.xls/.csv`, and
  `aero-foods/audit_images/`. Uploaded images under `images/` **are** committed (large).
- The root has a few stray files: `wq` (empty), `daily_sheet.php`/`del*.php`/`log_sheet.php`
  etc. duplicated at root **and** under `aero-foods/` — the canonical copies are under
  `aero-foods/`. Don't assume the root copies are used.
- Lots of feature folders are duplicated 6× (see §3). Search/grep across all of
  `src/components`, `src/com_*`, and `src/ojim` before assuming a change is localized.

---

## 9. Quick checklist before making changes

1. Which outlet(s) does this affect? If UI, plan to edit **all 6** sibling folders.
2. Which `API_BASE_URL` / database does it touch? Confirm the three-way mapping in §3.
3. Is it a summary/cross-company feature? Then it likely uses `?db=` and `src/components/summary/`.
4. For backend changes, edit `aero-foods/` as the reference; remember the deployed copies.
5. Avoid the `-`/`--` suffixed backup files — edit the un-suffixed active file.
6. After changes, `npm run build` to confirm the frontend still compiles.
