import React, { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";
const ReCalculate = () => {
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: "",
    database: "aero_foods_finance",
    user: "admin",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const databases = [
    { value: "aero_foods_finance", label: "Mixue Finance" },
    { value: "amazon_cafe_finance", label: "Amazon Cafe Finance" },
    { value: "amazon_cafe_finance_lyp", label: "Amazon Cafe Finance LYP" },
    { value: "abe_yus_finance", label: "Abe Yus Finance" },
    { value: "ojim_finance", label: "Ojim Finance" },
  ];

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - 5 + i,
  );

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

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);

    try {
      let url = `http://121.121.232.54:88/aero-foods/reconsole.php?year=${formData.year}&db=${formData.database}&user=${formData.user}`;

      // Only add month parameter if a month is selected
      if (formData.month !== "") {
        url += `&month=${formData.month}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to connect to server: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (success) => {
    if (success) return <CheckCircle size={20} className="text-success" />;
    return <XCircle size={20} className="text-danger" />;
  };

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
                        {databases.map((db) => (
                          <option key={db.value} value={db.value}>
                            {db.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year and Month Selection */}
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
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Month{" "}
                          <span className="text-muted small">(Optional)</span>
                        </label>
                        <select
                          name="month"
                          value={formData.month}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="">All Months</option>
                          {months.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* User Input */}
                    <div className="mb-4" style={{ display: "none" }}>
                      <label className="form-label fw-semibold">
                        Updated By (Username)
                      </label>
                      <input
                        type="text"
                        name="user"
                        value={formData.user}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="Enter your username"
                      />
                    </div>

                    {/* Update Button */}
                    <button
                      onClick={handleUpdate}
                      disabled={loading}
                      className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-2 ${
                        loading ? "btn-secondary" : "btn-primary"
                      }`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw
                            size={20}
                            className="spinner-border spinner-border-sm"
                          />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={20} />
                          <span>Update Records</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Results Display */}
                {result && (
                  <div
                    className={`alert ${
                      result.success ? "alert-success" : "alert-danger"
                    } shadow-sm`}
                  >
                    <div className="d-flex align-items-start gap-3">
                      <div className="mt-1">
                        {result.success ? (
                          <CheckCircle size={24} className="text-success" />
                        ) : (
                          <AlertCircle size={24} className="text-danger" />
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="alert-heading mb-2">
                          {result.success
                            ? "Update Successful"
                            : "Update Failed"}
                        </h5>

                        {result.database && (
                          <p className="mb-3 small">
                            <strong>Database:</strong> {result.database}
                            <br />
                            <strong>Period:</strong>{" "}
                            {result.month
                              ? `${
                                  months.find((m) => m.value === result.month)
                                    ?.label
                                } ${result.year}`
                              : `All months in ${result.year}`}
                          </p>
                        )}

                        {result.daily_sheet && (
                          <div className="card mb-2">
                            <div className="card-body py-2 px-3">
                              <div className="d-flex align-items-center gap-2 mb-1">
                                {getStatusIcon(result.daily_sheet.success)}
                                <strong className="small">Daily Sheet</strong>
                              </div>
                              <p className="mb-0 small text-muted ms-4">
                                {result.daily_sheet.message}
                                {result.daily_sheet.count > 0 && (
                                  <span className="ms-2">
                                    ({result.daily_sheet.count}/
                                    {result.daily_sheet.total} records)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {result.bank_reconciliation && (
                          <div className="card">
                            <div className="card-body py-2 px-3">
                              <div className="d-flex align-items-center gap-2 mb-1">
                                {getStatusIcon(
                                  result.bank_reconciliation.success,
                                )}
                                <strong className="small">
                                  Bank Reconciliation
                                </strong>
                              </div>
                              <p className="mb-0 small text-muted ms-4">
                                {result.bank_reconciliation.message}
                                {result.bank_reconciliation.count > 0 && (
                                  <span className="ms-2">
                                    ({result.bank_reconciliation.count}/
                                    {result.bank_reconciliation.total} records)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {result.message && !result.daily_sheet && (
                          <p className="mb-0 small">{result.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Card */}
                <div className="card border-primary">
                  <div className="card-body">
                    <h6 className="card-title text-primary mb-3">
                      How it works:
                    </h6>
                    <ul className="mb-0 small">
                      <li>Select the database you want to update</li>
                      <li>Choose the year for the records</li>
                      <li>
                        Optionally select a specific month, or leave blank to
                        update all months
                      </li>
                      <li>Click "Update Records" to recalculate all values</li>
                      <li>
                        Both daily sheet and bank reconciliation will be updated
                      </li>
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
