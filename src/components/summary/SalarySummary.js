import React, { useState, useEffect } from "react";

/* ─────────────────────────────────────────────
   Reverse-engineer daily_rate from known fields
   when the PHP didn't return it explicitly.
───────────────────────────────────────────── */
function deriveDailyRate(salary, hrs, isPH, isExtraDay) {
  salary = parseFloat(salary);
  hrs    = parseFloat(hrs);
  if (isNaN(salary) || isNaN(hrs) || hrs <= 0 || isExtraDay) return null;
  if (isPH) {
    if (hrs <= 8) return (salary * 8) / (hrs * 2);
    return (salary - (hrs - 8) * 8) / 2;
  } else {
    if (hrs <= 8) return (salary * 8) / hrs;
    return salary - (hrs - 8) * 8;
  }
}

/* ─────────────────────────────────────────────
   Calculation breakdown helper
───────────────────────────────────────────── */
function buildBreakdown(item) {
  const lines = [];
  const hrs       = parseFloat(item.hours);
  const salary    = parseFloat(item.salary);
  const isPH      = !!item.is_public_holiday;
  const isExtra   = !!item.is_extra_day;
  const type      = (item.employment_type || "").toLowerCase();
  const dayNum    = item.day_number != null && item.day_number !== "" ? item.day_number : "—";

  const fmtRM  = (v) => (isNaN(v) ? "N/A" : `RM ${parseFloat(v).toFixed(2)}`);
  const fmt4   = (v) => (isNaN(v) ? "N/A" : `RM ${parseFloat(v).toFixed(4)}`);

  if (type === "monthly") {
    let basic     = parseFloat(item.basic_salary);
    let dailyRate = parseFloat(item.daily_rate);

    if (isNaN(dailyRate) || dailyRate === 0) {
      dailyRate = deriveDailyRate(salary, hrs, isPH, isExtra);
    }
    if ((isNaN(basic) || basic === 0) && dailyRate !== null && !isNaN(dailyRate)) {
      basic = Math.round(dailyRate * 26);
    }

    lines.push({ label: "Employment Type",        value: "Monthly" });
    lines.push({ label: "Basic Salary",            value: fmtRM(basic) });
    lines.push({ label: "Daily Rate (Basic ÷ 26)", value: fmt4(dailyRate) });
    lines.push({ label: "OT Rate",                 value: "RM 8.00 / hr (flat)" });
    lines.push({ label: "Hours Worked",            value: `${hrs} hrs` });
    lines.push({ label: "Day No. This Month",      value: dayNum });
    lines.push({ label: "Public Holiday",          value: isPH ? "Yes" : "No" });
    lines.push({ label: "Extra Day (>26)",         value: isExtra ? "Yes" : "No" });
    lines.push({ label: "─────────────", value: "" });

    if (isExtra) {
      lines.push({ label: "Rule",        value: "Extra day beyond 26 → RM8/hr flat" });
      lines.push({ label: "Calculation", value: `${hrs} hrs × RM8 = ${fmtRM(salary)}` });
    } else if (isPH) {
      if (hrs <= 8) {
        lines.push({ label: "Rule", value: "Public holiday (≤8 hrs) → double basic pay" });
        lines.push({ label: "Calculation",
          value: `Daily Rate × (${hrs}/8) × 2 = ${fmt4(dailyRate)} × ${(hrs/8).toFixed(4)} × 2 = ${fmtRM(salary)}` });
      } else {
        const otHrs    = hrs - 8;
        const basePart = !isNaN(dailyRate) ? dailyRate * 2 : NaN;
        const otPart   = otHrs * 8;
        lines.push({ label: "Rule",               value: "Public holiday (>8 hrs) → double basic + OT × RM8" });
        lines.push({ label: "Base Pay (doubled)", value: `Daily Rate × 2 = ${fmtRM(basePart)}` });
        lines.push({ label: "Overtime Hours",     value: `${otHrs} hrs` });
        lines.push({ label: "OT Pay",             value: `${otHrs} × RM8 = ${fmtRM(otPart)}` });
        lines.push({ label: "Calculation",        value: `${fmtRM(basePart)} + ${fmtRM(otPart)} = ${fmtRM(salary)}` });
      }
    } else {
      if (hrs <= 8) {
        lines.push({ label: "Rule", value: "Normal day (≤8 hrs) → proportional daily rate" });
        lines.push({ label: "Calculation",
          value: `Daily Rate × (${hrs}/8) = ${fmt4(dailyRate)} × ${(hrs/8).toFixed(4)} = ${fmtRM(salary)}` });
      } else {
        const otHrs  = hrs - 8;
        const otPart = otHrs * 8;
        lines.push({ label: "Rule",             value: "Normal day (>8 hrs) → daily rate + OT × RM8" });
        lines.push({ label: "Base Pay (8 hrs)", value: fmtRM(dailyRate) });
        lines.push({ label: "Overtime Hours",   value: `${otHrs} hrs` });
        lines.push({ label: "OT Pay",           value: `${otHrs} × RM8 = ${fmtRM(otPart)}` });
        lines.push({ label: "Calculation",      value: `${fmtRM(dailyRate)} + ${fmtRM(otPart)} = ${fmtRM(salary)}` });
      }
    }
  } else {
    lines.push({ label: "Employment Type", value: "Hourly" });
    lines.push({ label: "Standard Rate",   value: "RM 8.00 / hr" });
    lines.push({ label: "Hours Worked",    value: `${hrs} hrs` });
    lines.push({ label: "Public Holiday",  value: isPH ? "Yes" : "No" });
    lines.push({ label: "─────────────", value: "" });

    if (isPH) {
      if (hrs <= 8) {
        lines.push({ label: "Rule",        value: "Public holiday (≤8 hrs) → RM16/hr" });
        lines.push({ label: "Calculation", value: `${hrs} hrs × RM16 = ${fmtRM(salary)}` });
      } else {
        const otHrs  = hrs - 8;
        lines.push({ label: "Rule",         value: "Public holiday (>8 hrs) → first 8 × RM16, rest × RM8" });
        lines.push({ label: "PH Pay (8 hrs)", value: `8 × RM16 = RM 128.00` });
        lines.push({ label: "OT Pay",        value: `${otHrs} hrs × RM8 = RM ${(otHrs * 8).toFixed(2)}` });
        lines.push({ label: "Calculation",   value: `RM 128.00 + RM ${(otHrs*8).toFixed(2)} = ${fmtRM(salary)}` });
      }
    } else {
      lines.push({ label: "Rule",        value: "Normal day → hrs × RM8" });
      lines.push({ label: "Calculation", value: `${hrs} hrs × RM8 = ${fmtRM(salary)}` });
    }
  }

  lines.push({ label: "─────────────", value: "" });
  lines.push({ label: "Total Salary", value: fmtRM(salary) });
  return lines;
}

/* ─────────────────────────────────────────────
   Breakdown Modal (salary cell click)
───────────────────────────────────────────── */
const BreakdownModal = ({ item, onClose }) => {
  if (!item) return null;
  const lines = buildBreakdown(item);

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    } catch { return d; }
  };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 10,
          padding: "28px 32px",
          minWidth: 380,
          maxWidth: 520,
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#212529" }}>
              {item.name}
            </div>
            <div style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
              {formatDate(item.month_date)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: 22,
              cursor: "pointer", color: "#6c757d", lineHeight: 1, padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {lines.map((line, i) => {
              const isSep    = line.label.startsWith("─");
              const isTotal  = line.label === "Total Salary";
              const isRule   = line.label === "Rule";

              if (isSep) {
                return (
                  <tr key={i}>
                    <td colSpan={2} style={{ borderTop: "1px solid #dee2e6", padding: "4px 0" }} />
                  </tr>
                );
              }
              return (
                <tr key={i} style={isTotal ? { backgroundColor: "#d4edda" } : {}}>
                  <td
                    style={{
                      padding: "5px 8px",
                      fontWeight: isTotal || isRule ? "600" : "normal",
                      color: isRule ? "#0056b3" : "#212529",
                      whiteSpace: "nowrap",
                      verticalAlign: "top",
                      width: "45%",
                    }}
                  >
                    {line.label}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      fontWeight: isTotal ? "700" : "normal",
                      color: isTotal ? "#155724" : "#212529",
                      wordBreak: "break-word",
                    }}
                  >
                    {line.value}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Public Holiday Modal (date column click)
───────────────────────────────────────────── */
const PublicHolidayModal = ({ date, existingHoliday, onClose, onSaved }) => {
  // existingHoliday is the full holiday record that contains this date (may span multiple days)
  const [holidayName, setHolidayName] = useState(existingHoliday?.holiday_name || "");
  const [dateEnd, setDateEnd]         = useState(existingHoliday?.date_end || date);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);

  const isAlreadyPH = !!existingHoliday;

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    } catch { return d; }
  };

  // Calculate duration for display
  const calcDuration = () => {
    try {
      const s = new Date(date);
      const e = new Date(dateEnd);
      if (isNaN(s) || isNaN(e) || e < s) return 1;
      return Math.round((e - s) / 86400000) + 1;
    } catch { return 1; }
  };

  const handleSave = async () => {
    if (!holidayName.trim()) {
      setError("Holiday name is required.");
      return;
    }
    if (dateEnd < date) {
      setError("End date cannot be before start date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("http://121.121.232.54:88/aero-foods/public_holiday_api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_start:   date,
          date_end:     dateEnd || date,
          holiday_name: holidayName.trim(),
        }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        onSaved();
        onClose();
      }
    } catch (e) {
      setError("Failed to save. Check network connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove this public holiday?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("http://121.121.232.54:88/aero-foods/public_holiday_api.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date_start: date }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        onSaved();
        onClose();
      }
    } catch (e) {
      setError("Failed to remove. Check network connection.");
    } finally {
      setSaving(false);
    }
  };

  const dur = calcDuration();

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 10,
          padding: "28px 32px",
          minWidth: 380,
          maxWidth: 480,
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: "bold", color: "#212529" }}>
              {isAlreadyPH ? "Edit Public Holiday" : "Declare Public Holiday"}
            </div>
            <div style={{ fontSize: 13, color: "#6c757d", marginTop: 3 }}>
              {formatDate(date)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: 22,
              cursor: "pointer", color: "#6c757d", lineHeight: 1, padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Current holiday info if editing */}
        {isAlreadyPH && existingHoliday.duration > 1 && (
          <div className="alert alert-warning py-2 px-3 mb-3" style={{ fontSize: 13 }}>
            <strong>Current:</strong> {existingHoliday.holiday_name}
            {" "}({existingHoliday.date_start} → {existingHoliday.date_end}, {existingHoliday.duration} days)
          </div>
        )}

        {/* Form */}
        <div className="mb-3">
          <label className="form-label fw-semibold" style={{ fontSize: 14 }}>
            Holiday Name <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Chinese New Year, Federal Territory Day"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="row mb-3">
          <div className="col-6">
            <label className="form-label fw-semibold" style={{ fontSize: 14 }}>Start Date</label>
            <input type="date" className="form-control" value={date} disabled />
          </div>
          <div className="col-6">
            <label className="form-label fw-semibold" style={{ fontSize: 14 }}>
              End Date
              <span style={{ color: "#6c757d", fontWeight: "normal", fontSize: 12 }}> (for multi-day)</span>
            </label>
            <input
              type="date"
              className="form-control"
              value={dateEnd}
              min={date}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
        </div>

        {dur > 1 && (
          <div className="alert alert-info py-2 px-3 mb-3" style={{ fontSize: 13 }}>
            Duration: <strong>{dur} days</strong>
          </div>
        )}

        <div className="small text-muted mb-3">
          Applies to <strong>all cafes</strong> for salary calculations.
        </div>

        {error && <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: 13 }}>{error}</div>}

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {isAlreadyPH && (
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={handleRemove}
                disabled={saving}
              >
                Remove Holiday
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn-warning btn-sm"
              onClick={handleSave}
              disabled={saving}
              style={{ minWidth: 80 }}
            >
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-1" role="status" />Saving...</>
              ) : (isAlreadyPH ? "Update" : "Save Holiday")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const SalarySummary = ({ month = 11, year = new Date().getFullYear() }) => {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [phWarning, setPhWarning]     = useState(null);   // PH table error from PHP
  const [selectedCafe, setSelectedCafe] = useState("aero_foods_finance");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [modalItem, setModalItem]     = useState(null);
  const [phModalDate, setPhModalDate] = useState(null);   // date string clicked
  const [phMap, setPhMap]             = useState({});     // date -> { holiday_name, description }
  const [cafeLoadStatus, setCafeLoadStatus] = useState({}); // { label: rowCount } for combined mode

  const cafes = [
    { value: "ojim_finance", label: "Ojim Cafe" },
    { value: "aero_foods_finance", label: "Mixue" },
    { value: "amazon_cafe_finance", label: "D' Amazon Cafe" },
    { value: "amazon_cafe_finance_lyp", label: "D' Amazon Cafe LYP" },
    { value: "abe_yus_finance", label: "Abe Yus" },
    { value: "combined", label: "Combined All Cafe" },
  ];

  const allCafesForCombined = [
    { value: "ojim_finance",            label: "Ojim" },
    { value: "aero_foods_finance",      label: "Mixue" },
    { value: "amazon_cafe_finance",     label: "Amazon" },
    { value: "amazon_cafe_finance_lyp", label: "Amazon LYP" },
    { value: "abe_yus_finance",         label: "Abe Yus" },
  ];

  useEffect(() => {
    setSelectedEmployee("all");
    fetchData();
  }, [month, selectedCafe, year]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setPhWarning(null);
    try {
      let merged = [];

      if (selectedCafe === "combined") {
        const results = await Promise.all(
          allCafesForCombined.map(({ value, label }) =>
            fetch(`http://121.121.232.54:88/aero-foods/salary_summary.php?month=${month}&db=${value}&year=${year}`)
              .then((r) => r.json())
              .then((result) => ({ result, label, error: null }))
              .catch((e) => ({ result: [], label, error: e.message || "Failed" })),
          ),
        );
        const status = {};
        results.forEach(({ result, label, error: fetchErr }) => {
          if (fetchErr) {
            status[label] = { count: 0, error: fetchErr };
            return;
          }
          if (!Array.isArray(result) || result.length === 0) {
            status[label] = { count: 0, error: !Array.isArray(result) ? "API error" : null };
            return;
          }
          const rows = result.filter((r) => !r.__ph_error);
          status[label] = { count: rows.length, error: null };
          rows.forEach((row) => {
            merged.push({ ...row });
          });
        });
        setCafeLoadStatus(status);
      } else {
        setCafeLoadStatus({});
        const res = await fetch(
          `http://121.121.232.54:88/aero-foods/salary_summary.php?month=${month}&db=${selectedCafe}&year=${year}`
        );
        const result = await res.json();
        if (result && result.error) {
          setError(result.error);
          setData([]);
        } else if (Array.isArray(result)) {
          const sentinel = result.find((r) => r.__ph_error);
          if (sentinel) setPhWarning(sentinel.__ph_error);
          merged = result.filter((r) => !r.__ph_error);
        }
      }

      setData(merged);

      // Fetch public holidays
      const phRes = await fetch(
        `http://121.121.232.54:88/aero-foods/public_holiday_api.php?year=${year}&month=${month}`
      );
      const phList = await phRes.json();
      if (Array.isArray(phList)) {
        const map = {};
        phList.forEach((ph) => {
          const start = new Date(ph.date_start);
          const end   = new Date(ph.date_end);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().substring(0, 10);
            map[key] = ph;
          }
        });
        setPhMap(map);
      }
    } catch (err) {
      setError("Failed to fetch salary data");
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
    if (!Array.isArray(data) || data.length === 0) {
      return { dates: [], employees: [], tableData: {}, rawMap: {}, phData: {}, totals: { byDate: {}, byEmployee: {} }, hrsTotal: { nh: 0, ot: 0, otPH: 0 } };
    }

    try {
      const dates     = [...new Set(data.map((item) => item?.month_date).filter(Boolean))].sort();
      const employees = [...new Set(data.map((item) => item?.name).filter(Boolean))].sort();

      const tableData = {};
      const rawMap    = {};
      const phData    = {};
      const totals    = { byDate: {}, byEmployee: {} };
      const hrsTotal  = { nh: 0, ot: 0, otPH: 0 };

      dates.forEach((d) => { totals.byDate[d] = 0; });
      employees.forEach((e) => { totals.byEmployee[e] = 0; });

      data.forEach((item) => {
        if (!item || !item.month_date || !item.name) return;
        const key    = `${item.month_date}_${item.name}`;
        const salary = parseFloat(item.salary) || 0;
        const hrs    = parseFloat(item.hours) || 0;
        tableData[key] = (tableData[key] || 0) + salary;
        if (rawMap[key]) {
          rawMap[key] = {
            ...rawMap[key],
            salary: (parseFloat(rawMap[key].salary) || 0) + salary,
            hours:  (parseFloat(rawMap[key].hours)  || 0) + hrs,
          };
        } else {
          rawMap[key] = { ...item };
        }
        if (item.is_public_holiday) {
          phData[item.month_date] = item.holiday_name || true;
          hrsTotal.otPH += hrs;
        } else {
          hrsTotal.nh += Math.min(hrs, 8);
          hrsTotal.ot += Math.max(0, hrs - 8);
        }
        if (totals.byDate[item.month_date] !== undefined) totals.byDate[item.month_date] += salary;
        if (totals.byEmployee[item.name]   !== undefined) totals.byEmployee[item.name]   += salary;
      });

      return { dates, employees, tableData, rawMap, phData, totals, hrsTotal };
    } catch (err) {
      console.error("Error processing salary data:", err);
      return { dates: [], employees: [], tableData: {}, rawMap: {}, phData: {}, totals: { byDate: {}, byEmployee: {} }, hrsTotal: { nh: 0, ot: 0, otPH: 0 } };
    }
  };

  const { dates, employees, tableData, rawMap, phData, totals, hrsTotal } = processData();

  const grandTotal = Object.values(totals.byEmployee).reduce(
    (sum, val) => sum + (parseFloat(val) || 0), 0
  );

  const displayEmployees = selectedEmployee === "all" ? employees : employees.filter(e => e === selectedEmployee);

  const filteredHrsTotal = selectedEmployee === "all" ? hrsTotal : (() => {
    const f = { nh: 0, ot: 0, otPH: 0 };
    data.forEach(item => {
      if (item.name !== selectedEmployee) return;
      const hrs = parseFloat(item.hours) || 0;
      if (item.is_public_holiday) { f.otPH += hrs; }
      else { f.nh += Math.min(hrs, 8); f.ot += Math.max(0, hrs - 8); }
    });
    return f;
  })();

  const filteredGrandTotal = selectedEmployee === "all"
    ? grandTotal
    : totals.byEmployee[selectedEmployee] || 0;

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "";
    return `RM ${parseFloat(value).toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "2-digit", day: "2-digit", year: "numeric",
      });
    } catch { return dateStr; }
  };

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const getMonthDisplay = () => {
    const monthStr = String(month);
    if (monthStr.includes(",")) {
      return monthStr
        .split(",")
        .map((m) => monthNames[parseInt(m.trim(), 10) - 1] || m)
        .join(" & ");
    }
    return monthNames[parseInt(monthStr, 10) - 1] || "Unknown";
  };

  const cellStyle = {
    cursor: "pointer",
    transition: "background-color 0.15s",
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* Breakdown Modal */}
      <BreakdownModal item={modalItem} onClose={() => setModalItem(null)} />

      {/* Public Holiday Modal */}
      {phModalDate && (
        <PublicHolidayModal
          date={phModalDate}
          existingHoliday={phMap[phModalDate] || null}
          onClose={() => setPhModalDate(null)}
          onSaved={fetchData}
        />
      )}

      <div className="mb-4">
        <h2 className="h2 fw-bold mb-3">
          Salary Summary - {getMonthDisplay()} {year}
        </h2>

        {/* Brand Selection */}
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title mb-3">Select Brand</h5>
            <div className="row">
              {cafes.map((cafe) => (
                <div className="col-md-3 col-sm-6 mb-2" key={cafe.value}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="salaryCafeSelection"
                      id={`salary_${cafe.value}`}
                      value={cafe.value}
                      checked={selectedCafe === cafe.value}
                      onChange={(e) => setSelectedCafe(e.target.value)}
                    />
                    <label className="form-check-label" htmlFor={`salary_${cafe.value}`}>
                      {cafe.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Filter */}
        {!loading && !error && employees.length > 0 && (
          <div className="card mb-3">
            <div className="card-body py-2">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <label className="fw-semibold mb-0" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                  Filter by Employee:
                </label>
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: 220 }}
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Hours Summary */}
        {!loading && !error && data.length > 0 && (
          <div className="card mb-3 border-primary">
            <div className="card-body py-2">
              <h6 className="card-title mb-2 fw-semibold text-primary">
                Hours Summary — {getMonthDisplay()} ({selectedCafe === "combined" ? "All Cafes" : cafes.find(c => c.value === selectedCafe)?.label})
                {selectedEmployee !== "all" && (
                  <span className="ms-2 badge bg-primary" style={{ fontSize: 12 }}>{selectedEmployee}</span>
                )}
              </h6>
              <div className="d-flex flex-wrap gap-4">
                <div className="text-center px-3 py-1 rounded" style={{ backgroundColor: "#d1ecf1", minWidth: 110 }}>
                  <div className="fw-bold fs-5 text-info">{filteredHrsTotal.nh.toFixed(1)}</div>
                  <div className="small text-muted">Total NH (Normal Hrs)</div>
                </div>
                <div className="text-center px-3 py-1 rounded" style={{ backgroundColor: "#ffeeba", minWidth: 110 }}>
                  <div className="fw-bold fs-5 text-warning">{filteredHrsTotal.ot.toFixed(1)}</div>
                  <div className="small text-muted">Total OT (Overtime)</div>
                </div>
                <div className="text-center px-3 py-1 rounded" style={{ backgroundColor: "#f8d7da", minWidth: 120 }}>
                  <div className="fw-bold fs-5 text-danger">{filteredHrsTotal.otPH.toFixed(1)}</div>
                  <div className="small text-muted">Total OT PH (Public Holiday)</div>
                </div>
                <div className="text-center px-3 py-1 rounded" style={{ backgroundColor: "#d4edda", minWidth: 130 }}>
                  <div className="fw-bold fs-5 text-success">RM {filteredGrandTotal.toFixed(2)}</div>
                  <div className="small text-muted">Total Salary Paid</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="d-flex align-items-center gap-3 mb-3 small text-muted flex-wrap">
          <span>
            <span style={{ display:"inline-block", width:14, height:14, backgroundColor:"#fff3cd", border:"1px solid #ffc107", marginRight:4 }} />
            Public Holiday
          </span>
          <span style={{ color:"#6c757d" }}>
            Click any <strong>date</strong> to declare/edit a public holiday &nbsp;|&nbsp;
            Click any <strong>salary cell</strong> to see calculation breakdown
          </span>
        </div>

        <button onClick={fetchData} disabled={loading} className="btn btn-primary">
          {loading ? (
            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Loading...</>
          ) : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {phWarning && (
        <div className="alert alert-warning" role="alert">
          <strong>Public holiday table error:</strong> {phWarning}
          <br />
          <small>
            Open <code>http://121.121.232.54:88/aero-foods/check_ph.php</code> in your browser to see which holiday tables exist in the database.
          </small>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="alert alert-info text-center" role="alert">
          No salary data available for this month
        </div>
      )}

      {!loading && !error && data.length > 0 && dates.length > 0 && (
        <div className="card shadow">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead className="table-success">
                  <tr>
                    <th className="text-start fw-semibold">Date</th>
                    {displayEmployees.map((emp) => (
                      <th key={emp} className="text-center fw-semibold">{emp}</th>
                    ))}
                    <th className="text-center fw-semibold bg-success bg-opacity-25">Daily Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date) => {
                    const isHoliday = !!(phData && phData[date]) || !!(phMap && phMap[date]);
                    const phInfo    = phMap[date] || null;
                    return (
                      <tr key={date} style={isHoliday ? { backgroundColor: "#fff3cd" } : {}}>
                        <td
                          className="fw-medium"
                          style={{
                            cursor: "pointer",
                            userSelect: "none",
                            whiteSpace: "nowrap",
                          }}
                          title={isHoliday ? `Public Holiday: ${phInfo?.holiday_name || ""} — Click to edit` : "Click to declare as public holiday"}
                          onClick={() => setPhModalDate(date)}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#ffeeba"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isHoliday ? "#fff3cd" : ""; }}
                        >
                          {formatDate(date)}
                          {isHoliday && (
                            <span className="badge bg-warning text-dark ms-2 small">
                              PH{phInfo?.holiday_name ? `: ${phInfo.holiday_name}` : ""}
                            </span>
                          )}
                          {!isHoliday && (
                            <span style={{ fontSize: 10, color: "#adb5bd", marginLeft: 6 }}>+PH</span>
                          )}
                        </td>
                        {displayEmployees.map((emp) => {
                          const key    = `${date}_${emp}`;
                          const salary = tableData[key];
                          const raw    = rawMap[key];
                          return (
                            <td
                              key={emp}
                              className="text-end"
                              style={raw ? { ...cellStyle, cursor: "pointer" } : {}}
                              title={raw ? "Click to see breakdown" : ""}
                              onClick={() => raw && setModalItem(raw)}
                              onMouseEnter={(e) => {
                                if (raw) e.currentTarget.style.backgroundColor = "#d1ecf1";
                              }}
                              onMouseLeave={(e) => {
                                if (raw) e.currentTarget.style.backgroundColor = isHoliday ? "#fff3cd" : "";
                              }}
                            >
                              {raw ? (
                                <span>
                                  {salary > 0 ? formatCurrency(salary) : <span style={{ color: "#adb5bd", fontSize: 12 }}>RM 0.00</span>}
                                  {raw?.hours ? (
                                    <span style={{ fontSize: 11, color: "#6c757d", display: "block" }}>
                                      {parseFloat(raw.hours)} hrs
                                    </span>
                                  ) : null}
                                </span>
                              ) : ""}
                            </td>
                          );
                        })}
                        <td className="text-end fw-semibold bg-light">
                          {formatCurrency(
                            displayEmployees.reduce((sum, emp) => sum + (tableData[`${date}_${emp}`] || 0), 0)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="table-success fw-bold">
                    <td>Total Salary</td>
                    {displayEmployees.map((emp) => (
                      <td key={emp} className="text-end">
                        {totals.byEmployee[emp] ? formatCurrency(totals.byEmployee[emp]) : "RM 0.00"}
                      </td>
                    ))}
                    <td className="text-end">{formatCurrency(filteredGrandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalarySummary;
