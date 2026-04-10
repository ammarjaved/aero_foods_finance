import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";

const OUTLETS = [
  { label: "Mixue", url: "http://121.121.232.54:88/aero-foods/fetch_bank_reconciliation_sheet.php" },
  { label: "Amazon Cafe", url: "http://121.121.232.54:88/amazon-cafe/fetch_bank_reconciliation_sheet.php" },
  { label: "Amazon Cafe LYP", url: "http://121.121.232.54:88/amazon-cafe-lyp/fetch_bank_reconciliation_sheet.php" },
  { label: "Abe Yus", url: "http://121.121.232.54:88/abe-yus/fetch_bank_reconciliation_sheet.php" },
  { label: "Ojim Cafe", url: "http://121.121.232.54:88/ojim-cafe/fetch_bank_reconciliation_sheet.php" },
];

const MONTHS = [
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

const fmt = (val) =>
  parseFloat(val || 0).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function AllTNG() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [outletData, setOutletData] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  const fetchAll = async (month, year) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        OUTLETS.map((outlet) =>
          fetch(`${outlet.url}?month=${month}&year=${year}`)
            .then((r) => r.json())
            .catch(() => [])
        )
      );
      const map = {};
      OUTLETS.forEach((outlet, i) => {
        map[outlet.label] = results[i] || [];
      });
      setOutletData(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(selectedMonth, selectedYear);
  }, []);

  const handleFilter = () => {
    fetchAll(selectedMonth, selectedYear);
  };

  // Sorted unique dates across all outlets
  const allDates = [
    ...new Set(
      Object.values(outletData)
        .flat()
        .map((r) => r.month_date)
        .filter(Boolean)
    ),
  ].sort();

  const getRecord = (date, outletLabel) =>
    (outletData[outletLabel] || []).find((r) => r.month_date === date) || null;

  const outletSum = (label, key) =>
    (outletData[label] || []).reduce((s, r) => s + parseFloat(r[key] || 0), 0);

  const totalRecords = Object.values(outletData).reduce((s, arr) => s + arr.length, 0);

  // Column footer totals (touch_n_go + duit_now per outlet, then grand sum)
  const footerGrandTotal = OUTLETS.reduce(
    (s, o) => s + outletSum(o.label, "touch_n_go") + outletSum(o.label, "duit_now"),
    0
  );

  const variance1Color = (val) =>
    parseFloat(val) < 0 ? "#dc3545" : "#198754";

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
            marginLeft: sidebarOpen ? "250px" : "0",
            transition: "margin-left 0.3s ease-in-out",
            height: "100%",
            overflowY: "auto",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div className="container-fluid py-3">

            {/* Page Header */}
            <div
              className="text-white mb-3 d-flex align-items-center"
              style={{ backgroundColor: "#e80000", borderRadius: "6px", padding: "12px 16px" }}
            >
              <h4 className="mb-0">All-TNG Summary</h4>
            </div>

            {/* Filters */}
            <div className="card shadow-sm mb-3">
              <div className="card-body py-2">
                <div className="row g-2 align-items-end">
                  <div className="col-auto">
                    <label className="form-label mb-1 fw-semibold small">Month</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-auto">
                    <label className="form-label mb-1 fw-semibold small">Year</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-auto">
                    <button
                      className="btn btn-sm text-white"
                      style={{ backgroundColor: "#e80000" }}
                      onClick={handleFilter}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Search"}
                    </button>
                  </div>
                  <div className="col-auto ms-auto">
                    <span className="badge bg-secondary">
                      {totalRecords} record{totalRecords !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5 text-muted">Loading...</div>
            ) : totalRecords === 0 ? (
              <div className="text-center py-5 text-muted">No records found.</div>
            ) : (
              <div className="card shadow-sm">
                <div className="card-body p-0">
                  <div style={{ overflowX: "auto" }}>
                    <table className="table table-bordered table-hover table-sm mb-0 text-center">
                      <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        {/* Row 1: cafe name groups */}
                        <tr style={{ backgroundColor: "#343a40", color: "white" }}>
                          <th
                            rowSpan={2}
                            style={{ verticalAlign: "middle", minWidth: 95, backgroundColor: "#343a40" }}
                          >
                            Date
                          </th>
                          {OUTLETS.map((o) => (
                            <th
                              key={o.label}
                              colSpan={5}
                              style={{ borderLeft: "2px solid #6c757d", backgroundColor: "#343a40" }}
                            >
                              {o.label}
                            </th>
                          ))}
                          <th
                            rowSpan={2}
                            style={{
                              verticalAlign: "middle",
                              minWidth: 110,
                              borderLeft: "2px solid #6c757d",
                              backgroundColor: "#b8860b",
                            }}
                          >
                            Total (All)
                          </th>
                          <th
                            rowSpan={2}
                            style={{
                              verticalAlign: "middle",
                              minWidth: 110,
                              borderLeft: "2px solid #6c757d",
                              backgroundColor: "#0d6efd",
                            }}
                          >
                            Total TNG
                          </th>
                          <th
                            rowSpan={2}
                            style={{
                              verticalAlign: "middle",
                              minWidth: 110,
                              borderLeft: "2px solid #6c757d",
                              backgroundColor: "#6c757d",
                            }}
                          >
                            Total Variance
                          </th>
                        </tr>
                        {/* Row 2: Touch N Go / Duit Now / TNG / Variance_1 sub-headers */}
                        <tr style={{ backgroundColor: "#495057", color: "white" }}>
                          {OUTLETS.map((o) => (
                            <React.Fragment key={o.label}>
                              <th
                                style={{
                                  minWidth: 100,
                                  fontSize: "11px",
                                  borderLeft: "2px solid #6c757d",
                                  backgroundColor: "#495057",
                                }}
                              >
                                Touch N Go
                              </th>
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: "#495057" }}>
                                Duit Now
                              </th>
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: "#b8860b" }}>
                                Total
                              </th>
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: "#0d6efd" }}>
                                TNG
                              </th>
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: "#6c757d" }}>
                                Variance
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allDates.map((date) => {
                          let rowTotal = 0;
                          let rowTotalTng = 0;
                          let rowTotalVariance = 0;
                          const cells = OUTLETS.map((o) => {
                            const rec = getRecord(date, o.label);
                            const tngPos = parseFloat(rec?.touch_n_go || 0);
                            const duit = parseFloat(rec?.duit_now || 0);
                            const tngBank = parseFloat(rec?.tng || 0);
                            const var1 = tngBank - (tngPos + duit);
                            rowTotal += tngPos + duit;
                            if (rec) { rowTotalTng += tngBank; rowTotalVariance += var1; }
                            return { rec, tngPos, duit, tngBank, var1 };
                          });

                          return (
                            <tr key={date}>
                              <td className="fw-semibold" style={{ whiteSpace: "nowrap" }}>
                                {new Date(date).toLocaleDateString("en-MY", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              {cells.map(({ rec, tngPos, duit, tngBank, var1 }, i) => (
                                <React.Fragment key={OUTLETS[i].label}>
                                  <td
                                    className="text-end"
                                    style={{ borderLeft: "2px solid #dee2e6" }}
                                  >
                                    {rec ? fmt(tngPos) : "-"}
                                  </td>
                                  <td className="text-end">
                                    {rec ? fmt(duit) : "-"}
                                  </td>
                                  <td className="text-end fw-semibold" style={{ backgroundColor: "#fff9e6" }}>
                                    {rec ? fmt(tngPos + duit) : "-"}
                                  </td>
                                  <td className="text-end" style={{ backgroundColor: "#cfe2ff" }}>
                                    {rec ? fmt(tngBank) : "-"}
                                  </td>
                                  <td
                                    className="text-end fw-semibold"
                                    style={{ color: rec ? variance1Color(var1) : "inherit" }}
                                  >
                                    {rec ? fmt(var1) : "-"}
                                  </td>
                                </React.Fragment>
                              ))}
                              <td
                                className="text-end fw-bold"
                                style={{ borderLeft: "2px solid #dee2e6", backgroundColor: "#fff9e6" }}
                              >
                                {fmt(rowTotal)}
                              </td>
                              <td
                                className="text-end fw-bold"
                                style={{ borderLeft: "2px solid #dee2e6", backgroundColor: "#cfe2ff" }}
                              >
                                {fmt(rowTotalTng)}
                              </td>
                              <td
                                className="text-end fw-bold"
                                style={{ borderLeft: "2px solid #dee2e6", color: variance1Color(rowTotalVariance) }}
                              >
                                {fmt(rowTotalVariance)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot style={{ backgroundColor: "#e9ecef", fontWeight: "bold" }}>
                        <tr>
                          <td className="text-end">Total</td>
                          {OUTLETS.map((o) => {
                            const tngPosTotal = outletSum(o.label, "touch_n_go");
                            const duitTotal = outletSum(o.label, "duit_now");
                            const tngBankTotal = outletSum(o.label, "tng");
                            const var1Total = tngBankTotal - (tngPosTotal + duitTotal);
                            return (
                              <React.Fragment key={o.label}>
                                <td
                                  className="text-end"
                                  style={{ borderLeft: "2px solid #dee2e6" }}
                                >
                                  {fmt(tngPosTotal)}
                                </td>
                                <td className="text-end">
                                  {fmt(duitTotal)}
                                </td>
                                <td className="text-end" style={{ backgroundColor: "#fff9e6" }}>
                                  {fmt(tngPosTotal + duitTotal)}
                                </td>
                                <td className="text-end" style={{ backgroundColor: "#cfe2ff" }}>
                                  {fmt(tngBankTotal)}
                                </td>
                                <td
                                  className="text-end"
                                  style={{ color: variance1Color(var1Total) }}
                                >
                                  {fmt(var1Total)}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td
                            className="text-end"
                            style={{ borderLeft: "2px solid #dee2e6", backgroundColor: "#fff3cd" }}
                          >
                            {fmt(footerGrandTotal)}
                          </td>
                          <td
                            className="text-end"
                            style={{ borderLeft: "2px solid #dee2e6", backgroundColor: "#cfe2ff" }}
                          >
                            {fmt(OUTLETS.reduce((s, o) => s + outletSum(o.label, "tng"), 0))}
                          </td>
                          <td
                            className="text-end"
                            style={{
                              borderLeft: "2px solid #dee2e6",
                              color: variance1Color(
                                OUTLETS.reduce((s, o) => s + outletSum(o.label, "tng") - outletSum(o.label, "touch_n_go") - outletSum(o.label, "duit_now"), 0)
                              ),
                            }}
                          >
                            {fmt(OUTLETS.reduce((s, o) => s + outletSum(o.label, "tng") - outletSum(o.label, "touch_n_go") - outletSum(o.label, "duit_now"), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AllTNG;
