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
  { label: "Mixue Sogo", url: "http://121.121.232.54:88/mixue-sogo/fetch_bank_reconciliation_sheet.php" },
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

// colours
const BG_BANK   = "#cfe2ff"; // blue-tinted — bank cols (dr_1, dr_2, cr, total)
const BG_TOTAL  = "#0d6efd"; // dark blue — total bank card header
const BG_POS    = "#fff9e6"; // yellow-tinted — POS cols (visa_master, touch_n_go)
const BG_VAR    = "#6c757d"; // grey — variance header

function AllBankCard() {
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

  const handleFilter = () => fetchAll(selectedMonth, selectedYear);

  const allDates = [
    ...new Set(
      Object.values(outletData).flat().map((r) => r.month_date).filter(Boolean)
    ),
  ].sort();

  const getRecord = (date, outletLabel) =>
    (outletData[outletLabel] || []).find((r) => r.month_date === date) || null;

  const outletSum = (label, key) =>
    (outletData[label] || []).reduce((s, r) => s + parseFloat(r[key] || 0), 0);

  const totalRecords = Object.values(outletData).reduce((s, arr) => s + arr.length, 0);

  const varianceColor = (val) => (parseFloat(val) < 0 ? "#dc3545" : "#198754");

  // Grand footer totals across all outlets
  const grandBankCard = OUTLETS.reduce(
    (s, o) =>
      s + outletSum(o.label, "dr_1") + outletSum(o.label, "dr_2") + outletSum(o.label, "cr"),
    0
  );
  const grandVariance = OUTLETS.reduce(
    (s, o) =>
      s +
      outletSum(o.label, "dr_1") + outletSum(o.label, "dr_2") + outletSum(o.label, "cr") -
      outletSum(o.label, "visa_master") - outletSum(o.label, "touch_n_go"),
    0
  );

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <Navbar sidebarOpen={() => setSidebarOpen(!sidebarOpen)} />
      <div className="d-flex" style={{ marginTop: "56px", height: "calc(100vh - 56px)" }}>
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
              <h4 className="mb-0">All Bank Card Summary</h4>
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
                              colSpan={8}
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
                              backgroundColor: BG_TOTAL,
                              color: "white",
                            }}
                          >
                            Total Bank Card
                          </th>
                          <th
                            rowSpan={2}
                            style={{
                              verticalAlign: "middle",
                              minWidth: 110,
                              borderLeft: "2px solid #6c757d",
                              backgroundColor: BG_VAR,
                              color: "white",
                            }}
                          >
                            Total Variance
                          </th>
                        </tr>

                        {/* Row 2: sub-headers per outlet */}
                        <tr style={{ backgroundColor: "#495057", color: "white" }}>
                          {OUTLETS.map((o) => (
                            <React.Fragment key={o.label}>
                              {/* POS side */}
                              <th style={{ minWidth: 90, fontSize: "11px", borderLeft: "2px solid #6c757d", backgroundColor: BG_POS, color: "#000" }}>
                                Visa/Master
                              </th>
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: BG_POS, color: "#000" }}>
                                Online Order
                              </th>
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: "#e6c200", color: "#000" }}>
                                POS Total
                              </th>
                              {/* Recon/Bank side */}
                              <th style={{ minWidth: 80, fontSize: "11px", backgroundColor: BG_BANK, color: "#000" }}>
                                DR 1
                              </th>
                              <th style={{ minWidth: 80, fontSize: "11px", backgroundColor: BG_BANK, color: "#000" }}>
                                DR 2
                              </th>
                              <th style={{ minWidth: 80, fontSize: "11px", backgroundColor: BG_BANK, color: "#000" }}>
                                CR
                              </th>
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: BG_TOTAL, color: "white" }}>
                                Total
                              </th>
                              {/* Variance */}
                              <th style={{ minWidth: 90, fontSize: "11px", backgroundColor: BG_VAR, color: "white" }}>
                                Variance
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {allDates.map((date) => {
                          let rowTotalBankCard = 0;
                          let rowTotalVariance = 0;

                          const cells = OUTLETS.map((o) => {
                            const rec = getRecord(date, o.label);
                            const dr1      = parseFloat(rec?.dr_1 || 0);
                            const dr2      = parseFloat(rec?.dr_2 || 0);
                            const cr       = parseFloat(rec?.cr || 0);
                            const total    = dr1 + dr2 + cr;
                            const visa     = parseFloat(rec?.visa_master || 0);
                            const tng      = parseFloat(rec?.touch_n_go || 0);
                            const variance = total - visa - tng;
                            if (rec) {
                              rowTotalBankCard += total;
                              rowTotalVariance += variance;
                            }
                            return { rec, dr1, dr2, cr, total, visa, tng, variance };
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
                              {cells.map(({ rec, dr1, dr2, cr, total, visa, tng, variance }, i) => (
                                <React.Fragment key={OUTLETS[i].label}>
                                  {/* POS first */}
                                  <td className="text-end" style={{ borderLeft: "2px solid #dee2e6", backgroundColor: rec ? BG_POS : undefined }}>
                                    {rec ? fmt(visa) : "-"}
                                  </td>
                                  <td className="text-end" style={{ backgroundColor: rec ? BG_POS : undefined }}>
                                    {rec ? fmt(tng) : "-"}
                                  </td>
                                  <td className="text-end fw-semibold" style={{ backgroundColor: rec ? "#fff0a0" : undefined }}>
                                    {rec ? fmt(visa + tng) : "-"}
                                  </td>
                                  {/* Recon/Bank after */}
                                  <td className="text-end" style={{ backgroundColor: rec ? BG_BANK : undefined }}>
                                    {rec ? fmt(dr1) : "-"}
                                  </td>
                                  <td className="text-end" style={{ backgroundColor: rec ? BG_BANK : undefined }}>
                                    {rec ? fmt(dr2) : "-"}
                                  </td>
                                  <td className="text-end" style={{ backgroundColor: rec ? BG_BANK : undefined }}>
                                    {rec ? fmt(cr) : "-"}
                                  </td>
                                  <td className="text-end fw-semibold" style={{ backgroundColor: rec ? "#b8d0f7" : undefined }}>
                                    {rec ? fmt(total) : "-"}
                                  </td>
                                  <td
                                    className="text-end fw-semibold"
                                    style={{ color: rec ? varianceColor(variance) : "inherit" }}
                                  >
                                    {rec ? fmt(variance) : "-"}
                                  </td>
                                </React.Fragment>
                              ))}
                              <td
                                className="text-end fw-bold"
                                style={{ borderLeft: "2px solid #dee2e6", backgroundColor: BG_BANK }}
                              >
                                {fmt(rowTotalBankCard)}
                              </td>
                              <td
                                className="text-end fw-bold"
                                style={{ borderLeft: "2px solid #dee2e6", color: varianceColor(rowTotalVariance) }}
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
                            const dr1T  = outletSum(o.label, "dr_1");
                            const dr2T  = outletSum(o.label, "dr_2");
                            const crT   = outletSum(o.label, "cr");
                            const totT  = dr1T + dr2T + crT;
                            const visaT = outletSum(o.label, "visa_master");
                            const tngT  = outletSum(o.label, "touch_n_go");
                            const varT  = totT - visaT - tngT;
                            return (
                              <React.Fragment key={o.label}>
                                {/* POS first */}
                                <td className="text-end" style={{ borderLeft: "2px solid #dee2e6", backgroundColor: BG_POS }}>{fmt(visaT)}</td>
                                <td className="text-end" style={{ backgroundColor: BG_POS }}>{fmt(tngT)}</td>
                                <td className="text-end fw-semibold" style={{ backgroundColor: "#fff0a0" }}>{fmt(visaT + tngT)}</td>
                                {/* Recon/Bank after */}
                                <td className="text-end" style={{ backgroundColor: BG_BANK }}>{fmt(dr1T)}</td>
                                <td className="text-end" style={{ backgroundColor: BG_BANK }}>{fmt(dr2T)}</td>
                                <td className="text-end" style={{ backgroundColor: BG_BANK }}>{fmt(crT)}</td>
                                <td className="text-end" style={{ backgroundColor: "#b8d0f7" }}>{fmt(totT)}</td>
                                <td className="text-end" style={{ color: varianceColor(varT) }}>{fmt(varT)}</td>
                              </React.Fragment>
                            );
                          })}
                          <td
                            className="text-end"
                            style={{ borderLeft: "2px solid #dee2e6", backgroundColor: BG_BANK }}
                          >
                            {fmt(grandBankCard)}
                          </td>
                          <td
                            className="text-end"
                            style={{ borderLeft: "2px solid #dee2e6", color: varianceColor(grandVariance) }}
                          >
                            {fmt(grandVariance)}
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

export default AllBankCard;
