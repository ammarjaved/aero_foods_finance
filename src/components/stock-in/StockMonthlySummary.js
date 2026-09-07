import React, { useEffect, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatNumber = (value, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(parseFloat(value || 0));

// Monthly purchase summary per item: total quantity bought and total amount
// paid, from the stock_in_transaction ledger. Defaults to the current month.
function StockMonthlySummary({ apiBaseUrl }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    years.push(y);
  }

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/fetch_stock_monthly_summary.php?month=${month}&year=${year}`,
      );
      const json = await res.json();
      if (json && json.status === "success" && Array.isArray(json.results)) {
        setRows(json.results);
      } else {
        setRows([]);
        setError((json && json.error) || "Failed to load summary.");
      }
    } catch (e) {
      setRows([]);
      setError("Failed to load summary. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, month, year]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Reload when stock is added elsewhere on the page (form or PDF import).
  useEffect(() => {
    window.addEventListener("newRecordAdded", fetchSummary);
    return () => window.removeEventListener("newRecordAdded", fetchSummary);
  }, [fetchSummary]);

  const term = search.trim().toLowerCase();
  const visible = term
    ? rows.filter(
        (r) =>
          String(r.name || "").toLowerCase().includes(term) ||
          String(r.code || "").toLowerCase().includes(term),
      )
    : rows;

  const totals = visible.reduce(
    (acc, r) => {
      acc.qty += parseFloat(r.total_quantity || 0);
      acc.amount += parseFloat(r.total_amount || 0);
      return acc;
    },
    { qty: 0, amount: 0 },
  );

  return (
    <div className="container-fluid px-0">
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label fw-semibold">Month</label>
              <select
                className="form-select"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              >
                {MONTHS.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Year</label>
              <select
                className="form-select"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Item name or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3 text-md-end">
              <button
                className="btn btn-outline-primary"
                onClick={fetchSummary}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-1"></i>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="card border-primary">
            <div className="card-body text-center">
              <h6 className="card-subtitle mb-2 text-muted">Items Purchased</h6>
              <h5 className="card-title text-primary fw-bold">
                {visible.length}
              </h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-info">
            <div className="card-body text-center">
              <h6 className="card-subtitle mb-2 text-muted">Total Quantity</h6>
              <h5 className="card-title text-info fw-bold">
                {formatNumber(totals.qty)}
              </h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-success">
            <div className="card-body text-center">
              <h6 className="card-subtitle mb-2 text-muted">
                Total Amount Paid
              </h6>
              <h5 className="card-title text-success fw-bold">
                RM {formatNumber(totals.amount)}
              </h5>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <strong>
            Stock Monthly Summary – {MONTHS[month - 1]} {year}
          </strong>
        </div>
        <div className="table-responsive">
          <table className="table table-striped table-hover table-bordered mb-0">
            <thead className="table-light text-dark fw-bold">
              <tr>
                <th style={{ width: "50px" }}>#</th>
                <th>Item Name</th>
                <th>Code</th>
                <th>Unit</th>
                <th className="text-end">Total Quantity</th>
                <th className="text-end">Total Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="spinner-border spinner-border-sm me-2" />
                    Loading...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No stock purchased in {MONTHS[month - 1]} {year}.
                  </td>
                </tr>
              ) : (
                visible.map((r, idx) => (
                  <tr key={`${r.code}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td className="fw-semibold">{r.name}</td>
                    <td>{r.code}</td>
                    <td>{r.unit}</td>
                    <td className="text-end">
                      {formatNumber(r.total_quantity)}
                    </td>
                    <td className="text-end">
                      {formatNumber(r.total_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr className="table-secondary fw-bold">
                  <td colSpan="4" className="text-end">
                    Total
                  </td>
                  <td className="text-end">{formatNumber(totals.qty)}</td>
                  <td className="text-end">{formatNumber(totals.amount)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default StockMonthlySummary;
