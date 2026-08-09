import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

function MonthlySalary({ month, year }) {
  const [selectedCafe, setSelectedCafe] = useState("aero_foods_finance");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const cafes = [
    { value: "aero_foods_finance", label: "Mixue", key: "mixue" },
    { value: "abe_yus_finance", label: "Abe Yus", key: "abe" },
    { value: "amazon_cafe_finance", label: "D' Amazon Cafe", key: "amz" },
    {
      value: "amazon_cafe_finance_lyp",
      label: "D' Amazon Cafe LYP",
      key: "amz-lyp",
    },
    { value: "ojim_finance", label: "Ojim Cafe", key: "ojim" },
    { value: "mixue_sogo", label: "Mixue Sogo", key: "mixue-sogo" },
    { value: "combined", label: "Combined All Cafe", key: "combined" },
  ];

  const allCafeDBs = cafes.filter((c) => c.value !== "combined");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(value || 0));
  };

  const getSelectedMonthLabel = () => {
    if (!month || month.length === 0) return "";
    if (month.length === 1) {
      const idx = parseInt(month[0]) - 1;
      return monthNames[idx] || month[0];
    }
    return month
      .slice()
      .sort()
      .map((m) => monthNames[parseInt(m) - 1])
      .join(", ");
  };

  const fetchData = useCallback(async () => {
    if (!month || month.length === 0) return;
    setLoading(true);
    setError(null);
    setExpandedRows({});

    const payMonth = month.slice().sort()[month.length - 1];

    try {
      let merged = [];

      if (selectedCafe === "combined") {
        const results = await Promise.all(
          allCafeDBs.map((cafe) =>
            fetch(
              `http://121.121.232.54:88/aero-foods/get_payroll_summary.php?db=${cafe.key}&month=${payMonth}&year=${year}`,
            )
              .then((r) => r.json())
              .then((result) => ({
                result,
                cafeLabel: cafe.label,
                error: null,
              }))
              .catch((e) => ({
                result: { results: [] },
                cafeLabel: cafe.label,
                error: e.message || "Failed",
              })),
          ),
        );

        results.forEach(({ result, cafeLabel }) => {
          if (result && result.results && Array.isArray(result.results)) {
            result.results.forEach((emp) => {
              merged.push({ ...emp, cafe: cafeLabel });
            });
          }
        });
      } else {
        const cafeObj = cafes.find((c) => c.value === selectedCafe);
        const cafeKey = cafeObj ? cafeObj.key : "mixue";
        const res = await fetch(
          `http://121.121.232.54:88/aero-foods/get_payroll_summary.php?db=${cafeKey}&month=${payMonth}&year=${year}`,
        );
        const result = await res.json();
        if (result && result.error) {
          setError(result.error);
          setData([]);
          setLoading(false);
          return;
        }
        if (result && result.results && Array.isArray(result.results)) {
          merged = result.results.map((emp) => ({
            ...emp,
            cafe: cafeObj ? cafeObj.label : "",
          }));
        }
      }

      setData(merged);
    } catch (err) {
      setError("Failed to fetch payroll data. Please try again.");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCafe, month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sumHours = (rows) =>
    (rows || []).reduce(
      (total, row) => total + (parseFloat(row.hours_worked) || 0),
      0,
    );

  const formatHours = (value) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(value || 0));

  const computeTakeHome = (emp) => {
    const basic = parseFloat(emp.basic_salary || 0);
    const overtime = parseFloat(emp.overtime_pay || 0);
    const phPremium = parseFloat(emp.ph_premium || 0);
    const allow = parseFloat(emp.total_allowances || 0);
    const deduct = parseFloat(emp.total_deductions || 0);
    return basic + overtime + phPremium + allow - deduct;
  };

  const toggleRow = (rowKey) => {
    setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  const totals = data.reduce(
    (acc, emp) => {
      acc.basic += parseFloat(emp.basic_salary || 0);
      acc.overtime += parseFloat(emp.overtime_pay || 0);
      acc.phPremium += parseFloat(emp.ph_premium || 0);
      acc.allowances += parseFloat(emp.total_allowances || 0);
      acc.deductions += parseFloat(emp.total_deductions || 0);
      acc.takeHome += computeTakeHome(emp);
      return acc;
    },
    {
      basic: 0,
      overtime: 0,
      phPremium: 0,
      allowances: 0,
      deductions: 0,
      takeHome: 0,
    },
  );

  const isCombined = selectedCafe === "combined";
  const numFixedCols = isCombined ? 4 : 3;

  if (loading && data.length === 0) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "300px" }}
      >
        <div className="text-center">
          <RefreshCw
            className="mb-2"
            size={32}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <p className="text-muted">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <h3 className="text-center fw-bold mb-3">
        Monthly Salary — {getSelectedMonthLabel()} {year}
      </h3>

      {/* Cafe Dropdown */}
      <div className="d-flex align-items-center justify-content-center mb-4">
        <label className="fw-semibold me-2 mb-0">Select Cafe:</label>
        <select
          className="form-select"
          style={{ maxWidth: "300px" }}
          value={selectedCafe}
          onChange={(e) => setSelectedCafe(e.target.value)}
        >
          {cafes.map((cafe) => (
            <option key={cafe.value} value={cafe.value}>
              {cafe.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          className="alert alert-danger border-start border-5 border-danger mb-4"
          role="alert"
        >
          {error}
        </div>
      )}

      {data.length === 0 && !error ? (
        <div className="text-center text-muted py-5">
          <p>No employee payroll data found for the selected cafe and month.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-muted">
                    Total Basic Salary
                  </h6>
                  <h5 className="card-title text-primary fw-bold">
                    RM {formatCurrency(totals.basic)}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-muted">
                    Total Overtime
                  </h6>
                  <h5 className="card-title text-info fw-bold">
                    RM {formatCurrency(totals.overtime)}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md">
              <div className="card border-secondary">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-muted">
                    Total PH
                  </h6>
                  <h5 className="card-title text-secondary fw-bold">
                    RM {formatCurrency(totals.phPremium)}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-muted">
                    Total Allowances
                  </h6>
                  <h5 className="card-title text-success fw-bold">
                    RM {formatCurrency(totals.allowances)}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-muted">
                    Total Deductions
                  </h6>
                  <h5 className="card-title text-danger fw-bold">
                    RM {formatCurrency(totals.deductions)}
                  </h5>
                </div>
              </div>
            </div>
            <div className="col-md">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h6 className="card-subtitle mb-2 text-muted">
                    Total Take Home
                  </h6>
                  <h5 className="card-title text-warning fw-bold">
                    RM {formatCurrency(totals.takeHome)}
                  </h5>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Table */}
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "4%" }}></th>
                      <th style={{ width: "4%" }}>#</th>
                      {isCombined && <th style={{ width: "10%" }}>Cafe</th>}
                      <th style={{ width: "13%" }}>Employee</th>
                      <th style={{ width: "8%" }}>Emp. Type</th>
                      <th className="text-end" style={{ width: "10%" }}>
                        Basic Salary
                      </th>
                      <th className="text-end" style={{ width: "10%" }}>
                        Overtime
                      </th>
                      <th className="text-end" style={{ width: "10%" }}>
                        PH
                      </th>
                      <th className="text-end" style={{ width: "10%" }}>
                        Allowances
                      </th>
                      <th className="text-end" style={{ width: "10%" }}>
                        Deductions
                      </th>
                      <th className="text-end" style={{ width: "11%" }}>
                        Take Home
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((emp, idx) => {
                      const rowKey = `${emp.employee_name}-${emp.cafe}-${idx}`;
                      const takeHome = computeTakeHome(emp);
                      const isExpanded = !!expandedRows[rowKey];
                      return (
                        <React.Fragment key={rowKey}>
                          <tr
                            style={{
                              cursor: "pointer",
                              backgroundColor: isExpanded
                                ? "#e7f1ff"
                                : undefined,
                            }}
                            onClick={() => toggleRow(rowKey)}
                          >
                            <td className="text-center">
                              <i
                                className={`fas ${isExpanded ? "fa-chevron-down" : "fa-chevron-right"}`}
                                style={{ fontSize: "12px", color: "#666" }}
                              ></i>
                            </td>
                            <td>{idx + 1}</td>
                            {isCombined && (
                              <td>
                                <span className="badge bg-secondary">
                                  {emp.cafe}
                                </span>
                              </td>
                            )}
                            <td className="fw-semibold">
                              {emp.employee_name}
                            </td>
                            <td>
                              {emp.employment_type === "Monthly" ||
                              emp.employment_type === "monthly" ? (
                                <span className="badge bg-primary">Monthly</span>
                              ) : (
                                <span className="badge bg-info text-dark">
                                  Hourly
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              RM {formatCurrency(emp.basic_salary)}
                            </td>
                            <td
                              className="text-end text-info"
                              title={
                                emp.overtime_hours
                                  ? `${emp.overtime_hours} OT hrs`
                                  : undefined
                              }
                            >
                              RM {formatCurrency(emp.overtime_pay)}
                            </td>
                            <td
                              className="text-end text-secondary"
                              title={
                                emp.ph_details && emp.ph_details.length > 0
                                  ? `${emp.ph_details.length} public holiday day(s)`
                                  : undefined
                              }
                            >
                              RM {formatCurrency(emp.ph_premium)}
                            </td>
                            <td className="text-end text-success">
                              RM {formatCurrency(emp.total_allowances)}
                            </td>
                            <td className="text-end text-danger">
                              RM {formatCurrency(emp.total_deductions)}
                            </td>
                            <td className="text-end fw-bold">
                              RM {formatCurrency(takeHome)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ backgroundColor: "#f8f9fa" }}>
                              <td></td>
                              <td colSpan={isCombined ? 10 : 9}>
                                <div className="row g-3">
                                  {/* Overtime list */}
                                  <div className="col-md-6">
                                    <h6 className="text-info fw-bold mb-2">
                                      <i className="fas fa-clock me-1"></i>
                                      Overtime
                                    </h6>
                                    {emp.overtime_details &&
                                    emp.overtime_details.length > 0 ? (
                                      <table className="table table-sm table-borderless mb-0">
                                        <thead>
                                          <tr className="border-bottom">
                                            <th style={{ fontSize: "12px" }}>
                                              Date
                                            </th>
                                            <th className="text-center" style={{ fontSize: "12px" }}>
                                              Worked
                                            </th>
                                            <th className="text-center" style={{ fontSize: "12px" }}>
                                              OT Hrs
                                            </th>
                                            <th className="text-end" style={{ fontSize: "12px" }}>
                                              OT Pay
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {emp.overtime_details.map((o, oi) => (
                                            <tr key={`ot-${rowKey}-${oi}`}>
                                              <td style={{ fontSize: "13px" }}>
                                                {o.date
                                                  ? new Date(o.date).toLocaleDateString(
                                                      "en-GB",
                                                    )
                                                  : "—"}
                                                {o.is_extra_day && (
                                                  <span
                                                    className="badge bg-light text-info ms-1"
                                                    title="Day beyond 26 — full day paid at RM8/hr"
                                                  >
                                                    Extra
                                                  </span>
                                                )}
                                              </td>
                                              <td
                                                className="text-center"
                                                style={{ fontSize: "13px" }}
                                              >
                                                {o.hours_worked} hrs
                                              </td>
                                              <td
                                                className="text-center"
                                                style={{ fontSize: "13px" }}
                                              >
                                                {o.ot_hours} hrs
                                              </td>
                                              <td
                                                className="text-end fw-semibold text-info"
                                                style={{ fontSize: "13px" }}
                                              >
                                                RM {formatCurrency(o.ot_pay)}
                                              </td>
                                            </tr>
                                          ))}
                                          <tr className="border-top">
                                            <td
                                              className="fw-bold"
                                              style={{ fontSize: "13px" }}
                                            >
                                              Total Overtime
                                            </td>
                                            <td
                                              className="text-center fw-bold"
                                              style={{ fontSize: "13px" }}
                                            >
                                              {formatHours(
                                                sumHours(emp.overtime_details),
                                              )}{" "}
                                              hrs
                                            </td>
                                            <td
                                              className="text-center fw-bold"
                                              style={{ fontSize: "13px" }}
                                            >
                                              {emp.overtime_hours} hrs
                                            </td>
                                            <td
                                              className="text-end fw-bold text-info"
                                              style={{ fontSize: "13px" }}
                                            >
                                              RM{" "}
                                              {formatCurrency(emp.overtime_pay)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p
                                        className="text-muted"
                                        style={{ fontSize: "13px" }}
                                      >
                                        No overtime for this period.
                                      </p>
                                    )}
                                    <p
                                      className="text-muted mb-0"
                                      style={{ fontSize: "11px" }}
                                    >
                                      OT rate: RM 8.00 / hr flat (hours beyond
                                      8 per day; days beyond 26 fully at
                                      RM8/hr for monthly staff).
                                    </p>
                                  </div>

                                  {/* Public holiday premium list */}
                                  <div className="col-md-6">
                                    <h6 className="text-secondary fw-bold mb-2">
                                      <i className="fas fa-calendar-day me-1"></i>
                                      Public Holiday
                                    </h6>
                                    {emp.ph_details &&
                                    emp.ph_details.length > 0 ? (
                                      <table className="table table-sm table-borderless mb-0">
                                        <thead>
                                          <tr className="border-bottom">
                                            <th style={{ fontSize: "12px" }}>
                                              Date
                                            </th>
                                            <th style={{ fontSize: "12px" }}>
                                              Holiday
                                            </th>
                                            <th className="text-center" style={{ fontSize: "12px" }}>
                                              Worked
                                            </th>
                                            <th className="text-end" style={{ fontSize: "12px" }}>
                                              PH Pay
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {emp.ph_details.map((p, pi) => (
                                            <tr key={`ph-${rowKey}-${pi}`}>
                                              <td style={{ fontSize: "13px" }}>
                                                {p.date
                                                  ? new Date(p.date).toLocaleDateString(
                                                      "en-GB",
                                                    )
                                                  : "—"}
                                              </td>
                                              <td style={{ fontSize: "13px" }}>
                                                {p.holiday_name || "—"}
                                              </td>
                                              <td
                                                className="text-center"
                                                style={{ fontSize: "13px" }}
                                              >
                                                {p.hours_worked} hrs
                                              </td>
                                              <td
                                                className="text-end fw-semibold text-secondary"
                                                style={{ fontSize: "13px" }}
                                              >
                                                RM {formatCurrency(p.premium)}
                                              </td>
                                            </tr>
                                          ))}
                                          <tr className="border-top">
                                            <td
                                              colSpan={2}
                                              className="fw-bold"
                                              style={{ fontSize: "13px" }}
                                            >
                                              Total PH
                                            </td>
                                            <td
                                              className="text-center fw-bold"
                                              style={{ fontSize: "13px" }}
                                            >
                                              {formatHours(
                                                sumHours(emp.ph_details),
                                              )}{" "}
                                              hrs
                                            </td>
                                            <td
                                              className="text-end fw-bold text-secondary"
                                              style={{ fontSize: "13px" }}
                                            >
                                              RM{" "}
                                              {formatCurrency(emp.ph_premium)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p
                                        className="text-muted"
                                        style={{ fontSize: "13px" }}
                                      >
                                        No public holidays worked this period.
                                      </p>
                                    )}
                                    <p
                                      className="text-muted mb-0"
                                      style={{ fontSize: "11px" }}
                                    >
                                      Extra pay above a normal day for the
                                      first 8 hrs of a public holiday: monthly
                                      staff get double the daily rate, hourly
                                      staff RM16/hr instead of RM8/hr. OT
                                      beyond 8 hrs stays RM8/hr and is listed
                                      under Overtime.
                                    </p>
                                  </div>

                                  {/* Allowances list */}
                                  <div className="col-md-6">
                                    <h6 className="text-success fw-bold mb-2">
                                      <i className="fas fa-plus-circle me-1"></i>
                                      Allowances
                                    </h6>
                                    {emp.allowances &&
                                    emp.allowances.length > 0 ? (
                                      <table className="table table-sm table-borderless mb-0">
                                        <thead>
                                          <tr className="border-bottom">
                                            <th style={{ fontSize: "12px" }}>
                                              Type
                                            </th>
                                            <th className="text-center" style={{ fontSize: "12px" }}>
                                              Recurring
                                            </th>
                                            <th className="text-center" style={{ fontSize: "12px" }}>
                                              Effective
                                            </th>
                                            <th className="text-end" style={{ fontSize: "12px" }}>
                                              Amount
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {emp.allowances.map((a, ai) => (
                                            <tr key={`allow-${rowKey}-${ai}`}>
                                              <td style={{ fontSize: "13px" }}>
                                                {a.allowance_type || "—"}
                                              </td>
                                              <td
                                                className="text-center"
                                                style={{ fontSize: "13px" }}
                                              >
                                                {a.is_recurring === true ||
                                                a.is_recurring === "t" ? (
                                                  <span className="badge bg-light text-success">
                                                    Yes
                                                  </span>
                                                ) : (
                                                  <span className="badge bg-light text-muted">
                                                    No
                                                  </span>
                                                )}
                                              </td>
                                              <td
                                                className="text-center"
                                                style={{ fontSize: "12px", color: "#888" }}
                                              >
                                                {a.effective_from
                                                  ? new Date(a.effective_from).toLocaleDateString(
                                                      "en-GB",
                                                    )
                                                  : "—"}
                                                {a.effective_to
                                                  ? ` → ${new Date(a.effective_to).toLocaleDateString("en-GB")}`
                                                  : ""}
                                              </td>
                                              <td
                                                className="text-end fw-semibold text-success"
                                                style={{ fontSize: "13px" }}
                                              >
                                                RM {formatCurrency(a.amount)}
                                              </td>
                                            </tr>
                                          ))}
                                          <tr className="border-top">
                                            <td
                                              colSpan={3}
                                              className="fw-bold"
                                              style={{ fontSize: "13px" }}
                                            >
                                              Total Allowances
                                            </td>
                                            <td
                                              className="text-end fw-bold text-success"
                                              style={{ fontSize: "13px" }}
                                            >
                                              RM{" "}
                                              {formatCurrency(
                                                emp.total_allowances,
                                              )}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p
                                        className="text-muted"
                                        style={{ fontSize: "13px" }}
                                      >
                                        No allowances for this period.
                                      </p>
                                    )}
                                  </div>

                                  {/* Deductions list */}
                                  <div className="col-md-6">
                                    <h6 className="text-danger fw-bold mb-2">
                                      <i className="fas fa-minus-circle me-1"></i>
                                      Deductions
                                    </h6>
                                    {emp.deductions &&
                                    emp.deductions.length > 0 ? (
                                      <table className="table table-sm table-borderless mb-0">
                                        <thead>
                                          <tr className="border-bottom">
                                            <th style={{ fontSize: "12px" }}>
                                              Type
                                            </th>
                                            <th className="text-center" style={{ fontSize: "12px" }}>
                                              Recurring
                                            </th>
                                            <th className="text-center" style={{ fontSize: "12px" }}>
                                              Period
                                            </th>
                                            <th className="text-end" style={{ fontSize: "12px" }}>
                                              Amount
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {emp.deductions.map((d, di) => (
                                            <tr key={`deduct-${rowKey}-${di}`}>
                                              <td style={{ fontSize: "13px" }}>
                                                {d.deduction_type || "—"}
                                              </td>
                                              <td
                                                className="text-center"
                                                style={{ fontSize: "13px" }}
                                              >
                                                {d.is_recurring === true ||
                                                d.is_recurring === "t" ? (
                                                  <span className="badge bg-light text-danger">
                                                    Yes
                                                  </span>
                                                ) : (
                                                  <span className="badge bg-light text-muted">
                                                    {d.pay_month && d.pay_year
                                                      ? `${d.pay_month}/${d.pay_year}`
                                                      : "No"}
                                                  </span>
                                                )}
                                              </td>
                                              <td
                                                className="text-center"
                                                style={{ fontSize: "12px", color: "#888" }}
                                              >
                                                {d.is_recurring === true ||
                                                d.is_recurring === "t"
                                                  ? "Recurring"
                                                  : d.installment_no &&
                                                    d.total_installments
                                                    ? `${d.installment_no}/${d.total_installments}`
                                                    : d.pay_month && d.pay_year
                                                      ? `${d.pay_month}/${d.pay_year}`
                                                      : "—"}
                                              </td>
                                              <td
                                                className="text-end fw-semibold text-danger"
                                                style={{ fontSize: "13px" }}
                                              >
                                                RM {formatCurrency(d.amount)}
                                              </td>
                                            </tr>
                                          ))}
                                          <tr className="border-top">
                                            <td
                                              colSpan={3}
                                              className="fw-bold"
                                              style={{ fontSize: "13px" }}
                                            >
                                              Total Deductions
                                            </td>
                                            <td
                                              className="text-end fw-bold text-danger"
                                              style={{ fontSize: "13px" }}
                                            >
                                              RM{" "}
                                              {formatCurrency(
                                                emp.total_deductions,
                                              )}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    ) : (
                                      <p
                                        className="text-muted"
                                        style={{ fontSize: "13px" }}
                                      >
                                        No deductions for this period.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Overall total for this employee */}
                                <div className="border-top mt-3 pt-2">
                                  <div className="d-flex flex-wrap align-items-center justify-content-end gap-3">
                                    <span style={{ fontSize: "13px" }}>
                                      Total worked:{" "}
                                      <strong>
                                        {formatHours(emp.worked_hours)} hrs
                                      </strong>
                                      {emp.worked_days ? (
                                        <span className="text-muted">
                                          {" "}
                                          over {emp.worked_days} day
                                          {emp.worked_days > 1 ? "s" : ""}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span style={{ fontSize: "13px" }}>
                                      Basic{" "}
                                      <strong>
                                        RM {formatCurrency(emp.basic_salary)}
                                      </strong>{" "}
                                      + OT{" "}
                                      <strong className="text-info">
                                        RM {formatCurrency(emp.overtime_pay)}
                                      </strong>{" "}
                                      + PH{" "}
                                      <strong className="text-secondary">
                                        RM {formatCurrency(emp.ph_premium)}
                                      </strong>{" "}
                                      + Allowances{" "}
                                      <strong className="text-success">
                                        RM{" "}
                                        {formatCurrency(emp.total_allowances)}
                                      </strong>{" "}
                                      &minus; Deductions{" "}
                                      <strong className="text-danger">
                                        RM{" "}
                                        {formatCurrency(emp.total_deductions)}
                                      </strong>
                                    </span>
                                    <span
                                      className="badge bg-warning text-dark"
                                      style={{ fontSize: "14px" }}
                                    >
                                      Total Take Home: RM{" "}
                                      {formatCurrency(takeHome)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-active fw-bold">
                      <td></td>
                      <td colSpan={numFixedCols}>
                        TOTAL ({data.length} employees)
                      </td>
                      <td className="text-end">
                        RM {formatCurrency(totals.basic)}
                      </td>
                      <td className="text-end">
                        RM {formatCurrency(totals.overtime)}
                      </td>
                      <td className="text-end">
                        RM {formatCurrency(totals.phPremium)}
                      </td>
                      <td className="text-end">
                        RM {formatCurrency(totals.allowances)}
                      </td>
                      <td className="text-end">
                        RM {formatCurrency(totals.deductions)}
                      </td>
                      <td className="text-end">
                        RM {formatCurrency(totals.takeHome)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <p className="text-muted mt-2" style={{ fontSize: "13px" }}>
            <i className="fas fa-info-circle me-1"></i>
            Click any employee row to expand and view the day-by-day overtime,
            individual allowances and deductions for the selected month.
          </p>
        </>
      )}
    </div>
  );
}

export default MonthlySalary;
