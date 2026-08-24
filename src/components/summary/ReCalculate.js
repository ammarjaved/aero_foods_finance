import React, { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";
import { canEdit } from "../../roles";

const ALL_DATABASES = [
  { value: "aero_foods_finance",       label: "Mixue Finance" },
  { value: "amazon_cafe_finance",      label: "Amazon Cafe Finance" },
  { value: "amazon_cafe_finance_lyp",  label: "Amazon Cafe Finance LYP" },
  { value: "abe_yus_finance",          label: "Abe Yus Finance" },
  { value: "ojim_finance",             label: "Ojim Finance" },
  { value: "mixue_sogo",               label: "Mixue Sogo Finance" },
];

const DATABASES = [
  { value: "all", label: "All Databases" },
  ...ALL_DATABASES,
];

const MONTHS = [
  { value: 1,  label: "January" },
  { value: 2,  label: "February" },
  { value: 3,  label: "March" },
  { value: 4,  label: "April" },
  { value: 5,  label: "May" },
  { value: 6,  label: "June" },
  { value: 7,  label: "July" },
  { value: 8,  label: "August" },
  { value: 9,  label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const ReCalculate = () => {
  const allowEdit = canEdit();
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: "",
    database: "all",
    user: "admin",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);           // single DB result
  const [allResults, setAllResults] = useState([]);     // multi DB results
  const [currentDb, setCurrentDb] = useState("");       // which DB is running now
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "year" || name === "month"
          ? value === ""
            ? ""
            : parseInt(value)
          : value,
    }));
  };

  const buildUrl = (db) => {
    let url = `http://121.121.232.54:88/aero-foods/reconsole.php?year=${formData.year}&db=${db}&user=${formData.user}`;
    if (formData.month !== "") url += `&month=${formData.month}`;
    return url;
  };

  const runSingle = async (db) => {
    const response = await fetch(buildUrl(db));
    return await response.json();
  };

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    setAllResults([]);

    if (formData.database === "all") {
      // Run all databases one by one
      const results = [];
      for (const db of ALL_DATABASES) {
        setCurrentDb(db.label);
        try {
          const data = await runSingle(db.value);
          results.push({ db: db.label, ...data });
        } catch (error) {
          results.push({
            db: db.label,
            success: false,
            message: "Failed to connect: " + error.message,
          });
        }
        setAllResults([...results]);
      }
      setCurrentDb("");
    } else {
      // Single database
      try {
        const data = await runSingle(formData.database);
        setResult(data);
      } catch (error) {
        setResult({
          success: false,
          message: "Failed to connect to server: " + error.message,
        });
      }
    }

    setLoading(false);
  };

  const getStatusIcon = (success) =>
    success
      ? <CheckCircle size={20} className="text-success" />
      : <XCircle size={20} className="text-danger" />;

  const monthLabel = (m) => MONTHS.find((x) => x.value === m)?.label;

  // ── Single DB result card (reused below) ──────────────────────────────────
  const SingleResult = ({ r, compact = false }) => (
    <div className={`alert ${r.success ? "alert-success" : "alert-danger"} shadow-sm mb-2`}>
      <div className="d-flex align-items-start gap-3">
        <div className="mt-1">
          {r.success
            ? <CheckCircle size={compact ? 18 : 24} className="text-success" />
            : <AlertCircle size={compact ? 18 : 24} className="text-danger" />}
        </div>
        <div className="flex-grow-1">
          {compact && (
            <h6 className="mb-1 fw-bold">{r.db}</h6>
          )}
          {!compact && (
            <h5 className="alert-heading mb-2">
              {r.success ? "Update Successful" : "Update Failed"}
            </h5>
          )}

          {r.database && (
            <p className="mb-2 small">
              <strong>Database:</strong> {r.database}
              <br />
              <strong>Period:</strong>{" "}
              {r.month ? `${monthLabel(r.month)} ${r.year}` : `All months in ${r.year}`}
            </p>
          )}

          {r.daily_sheet && (
            <div className="card mb-2">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  {getStatusIcon(r.daily_sheet.success)}
                  <strong className="small">Daily Sheet</strong>
                </div>
                <p className="mb-0 small text-muted ms-4">
                  {r.daily_sheet.message}
                  {r.daily_sheet.count > 0 && (
                    <span className="ms-2">
                      ({r.daily_sheet.count}/{r.daily_sheet.total} records)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {r.bank_reconciliation && (
            <div className="card">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  {getStatusIcon(r.bank_reconciliation.success)}
                  <strong className="small">Bank Reconciliation</strong>
                </div>
                <p className="mb-0 small text-muted ms-4">
                  {r.bank_reconciliation.message}
                  {r.bank_reconciliation.count > 0 && (
                    <span className="ms-2">
                      ({r.bank_reconciliation.count}/{r.bank_reconciliation.total} records)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {r.message && !r.daily_sheet && (
            <p className="mb-0 small">{r.message}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <Navbar sidebarOpen={() => setSidebarOpen(!sidebarOpen)} />
      <div
        className="d-flex"
        style={{ marginTop: "56px", height: "calc(100vh - 56px)" }}
      >
        <Sidebar sidebarOpen={sidebarOpen} />

        <div
          className="w-100"
          style={{
            height: "100%",
            overflowY: "auto",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div className="container py-4">
            <div className="row justify-content-center">
              <div className="col-lg-8 col-md-10">

                {/* Main Card */}
                <div className="card shadow-sm mb-4">
                  <div className="card-body p-4">
                    <div className="mb-4">
                      <h2 className="card-title mb-2">Daily Sheet Updater</h2>
                      <p className="text-muted">
                        Update daily sheet and bank reconciliation calculations
                      </p>
                    </div>

                    {/* Database Selection */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Database</label>
                      <select
                        name="database"
                        value={formData.database}
                        onChange={handleChange}
                        className="form-select"
                      >
                        {DATABASES.map((db) => (
                          <option key={db.value} value={db.value}>
                            {db.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year and Month */}
                    <div className="row mb-3">
                      <div className="col-md-6 mb-3 mb-md-0">
                        <label className="form-label fw-semibold">Year</label>
                        <select
                          name="year"
                          value={formData.year}
                          onChange={handleChange}
                          className="form-select"
                        >
                          {years.map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Month <span className="text-muted small">(Optional)</span>
                        </label>
                        <select
                          name="month"
                          value={formData.month}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="">All Months</option>
                          {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Update Button */}
                    <button
                      onClick={handleUpdate}
                      disabled={loading || !allowEdit}
                      title={
                        allowEdit
                          ? undefined
                          : "View-only accounts cannot run the updater"
                      }
                      className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-2 ${
                        loading ? "btn-secondary" : "btn-primary"
                      }`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={20} className="spinner-border spinner-border-sm" />
                          <span>
                            {formData.database === "all" && currentDb
                              ? `Updating ${currentDb}…`
                              : "Updating…"}
                          </span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={20} />
                          <span>
                            {formData.database === "all"
                              ? "Update All Databases"
                              : "Update Records"}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Progress bar when running all */}
                    {loading && formData.database === "all" && (
                      <div className="mt-3">
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>{currentDb || "Starting…"}</span>
                          <span>{allResults.length} / {ALL_DATABASES.length}</span>
                        </div>
                        <div className="progress" style={{ height: "6px" }}>
                          <div
                            className="progress-bar bg-primary"
                            style={{
                              width: `${(allResults.length / ALL_DATABASES.length) * 100}%`,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── All-DB results ── */}
                {allResults.length > 0 && (
                  <div className="mb-4">
                    <h5 className="fw-semibold mb-3">
                      Results ({allResults.length}/{ALL_DATABASES.length})
                    </h5>
                    {allResults.map((r, i) => (
                      <SingleResult key={i} r={r} compact={true} />
                    ))}
                  </div>
                )}

                {/* ── Single DB result ── */}
                {result && <SingleResult r={result} compact={false} />}

                {/* Info Card */}
                <div className="card border-primary">
                  <div className="card-body">
                    <h6 className="card-title text-primary mb-3">How it works:</h6>
                    <ul className="mb-0 small">
                      <li>Select <strong>All Databases</strong> to update every cafe at once</li>
                      <li>Or pick a specific database to update only that one</li>
                      <li>Choose the year for the records</li>
                      <li>Optionally select a specific month, or leave blank to update all months</li>
                      <li>Click "Update Records" to recalculate all values</li>
                      <li>Both daily sheet and bank reconciliation will be updated</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReCalculate;
