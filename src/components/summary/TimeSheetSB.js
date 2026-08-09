import React, { useState, useEffect } from "react";

const TimesheetSB = ({ month = 11, year = new Date().getFullYear() }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Non-fatal: some brands loaded, others did not. The table still renders.
  const [warning, setWarning] = useState(null);
  const [selectedCafe, setSelectedCafe] = useState("aero_foods_finance");

  const cafes = [
    { value: "ojim_finance", label: "Ojim Cafe" },
    { value: "mixue_sogo", label: "Mixue Sogo" },
    { value: "aero_foods_finance", label: "Mixue" },
    { value: "amazon_cafe_finance", label: "D' Amazon Cafe" },
    { value: "amazon_cafe_finance_lyp", label: "D' Amazon Cafe LYP" },
    { value: "abe_yus_finance", label: "Abe Yus" },
    { value: "combined", label: "Combined All Cafe" },
  ];

  const allCafeDBs = cafes.filter((c) => c.value !== "combined");
  const isCombined = selectedCafe === "combined";

  useEffect(() => {
    fetchData();
  }, [month, selectedCafe, year]);

  const fetchOneCafe = async (cafe) => {
    const response = await fetch(
      `http://121.121.232.54:88/aero-foods/timesheet_sb.php?month=${month}&db=${cafe.value}&year=${year}`,
    );
    const result = await response.json();
    return (Array.isArray(result) ? result : []).map((row) => ({
      ...row,
      cafe: cafe.label,
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      if (isCombined) {
        // Pull every cafe in parallel. One unreachable cafe must not blank out
        // the whole sheet, so a failed brand contributes no rows and is named
        // in a warning instead.
        const settled = await Promise.all(
          allCafeDBs.map((cafe) =>
            fetchOneCafe(cafe).catch((err) => {
              console.error(`Failed to load ${cafe.label}:`, err);
              return { failed: cafe.label };
            }),
          ),
        );

        const failed = settled
          .filter((r) => r && r.failed)
          .map((r) => r.failed);
        const rows = settled.filter(Array.isArray).flat();

        setData(rows);
        if (failed.length > 0) {
          setWarning(
            `Could not load: ${failed.join(", ")}. The totals below exclude ${
              failed.length > 1 ? "those brands" : "that brand"
            }.`,
          );
        }
      } else {
        const cafe = cafes.find((c) => c.value === selectedCafe);
        setData(await fetchOneCafe(cafe || { value: selectedCafe, label: "" }));
      }
    } catch (err) {
      setError("Failed to fetch data");
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        dates: [],
        employees: [],
        tableData: {},
        totals: { byDate: {}, byEmployee: {} },
        columnMeta: {},
      };
    }

    try {
      const dates = [
        ...new Set(data.map((item) => item?.month_date).filter(Boolean)),
      ].sort();

      // Combined view: the same name can exist at more than one brand (and may
      // be two different people), so each brand gets its own column rather than
      // silently summing them into one. Single-brand view is keyed by name as
      // before.
      const columnId = (item) =>
        isCombined ? `${item.cafe}||${item.name}` : item.name;

      const columnMeta = {};
      data.forEach((item) => {
        if (!item || !item.name) return;
        columnMeta[columnId(item)] = {
          name: item.name,
          cafe: item.cafe || "",
        };
      });

      const employees = Object.keys(columnMeta).sort((a, b) => {
        if (isCombined && columnMeta[a].cafe !== columnMeta[b].cafe) {
          return columnMeta[a].cafe.localeCompare(columnMeta[b].cafe);
        }
        return columnMeta[a].name.localeCompare(columnMeta[b].name);
      });

      const tableData = {};
      const totals = { byDate: {}, byEmployee: {} };

      dates.forEach((date) => {
        if (date) totals.byDate[date] = 0;
      });
      employees.forEach((emp) => {
        if (emp) totals.byEmployee[emp] = 0;
      });

      data.forEach((item) => {
        if (!item || !item.month_date || !item.name) return;

        const key = `${item.month_date}_${columnId(item)}`;
        const hours = parseFloat(item.total_hr) || 0;
        tableData[key] = (tableData[key] || 0) + hours;

        if (totals.byDate[item.month_date] !== undefined) {
          totals.byDate[item.month_date] += hours;
        }
        if (totals.byEmployee[columnId(item)] !== undefined) {
          totals.byEmployee[columnId(item)] += hours;
        }
      });

      return { dates, employees, tableData, totals, columnMeta };
    } catch (err) {
      console.error("Error processing data:", err);
      return {
        dates: [],
        employees: [],
        tableData: {},
        totals: { byDate: {}, byEmployee: {} },
        columnMeta: {},
      };
    }
  };

  const processedData = processData();
  const {
    dates = [],
    employees = [],
    tableData = {},
    totals = { byDate: {}, byEmployee: {} },
    columnMeta = {},
  } = processedData;

  // Per-brand totals for the combined view.
  const cafeTotals = employees.reduce((acc, emp) => {
    const cafe = columnMeta[emp]?.cafe || "";
    acc[cafe] = (acc[cafe] || 0) + (totals.byEmployee[emp] || 0);
    return acc;
  }, {});

  // Contiguous runs of columns belonging to the same brand, for the grouped
  // header band. employees is already sorted by cafe then name.
  const cafeGroups = employees.reduce((groups, emp) => {
    const cafe = columnMeta[emp]?.cafe || "";
    const last = groups[groups.length - 1];
    if (last && last.cafe === cafe) {
      last.count += 1;
    } else {
      groups.push({ cafe, count: 1 });
    }
    return groups;
  }, []);

  // True for the first column of each brand, used to draw the divider line.
  const startsBrand = (idx) =>
    isCombined &&
    (idx === 0 ||
      (columnMeta[employees[idx - 1]]?.cafe || "") !==
        (columnMeta[employees[idx]]?.cafe || ""));

  const calculateGrandTotal = () => {
    try {
      if (!totals.byEmployee || typeof totals.byEmployee !== "object") return 0;
      const values = Object.values(totals.byEmployee);
      return values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    } catch (err) {
      console.error("Error calculating grand total:", err);
      return 0;
    }
  };

  const grandTotal = calculateGrandTotal();

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    } catch (err) {
      return dateStr;
    }
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getMonthDisplay = () => {
    const monthStr = String(month);

    if (monthStr.includes(",")) {
      const months = monthStr.split(",").map((m) => m.trim());
      const monthLabels = months
        .map((m) => {
          const monthNum = parseInt(m, 10);
          return monthNames[monthNum - 1] || m;
        })
        .join(" & ");
      return monthLabels;
    }

    const monthNum = parseInt(monthStr, 10);
    return monthNames[monthNum - 1] || "Unknown";
  };

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="mb-4">
        <h2 className="h2 fw-bold mb-3">
          Timesheet - {getMonthDisplay()} {year}
        </h2>

        {/* Cafe Selection Radio Buttons */}
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
                      name="cafeSelection"
                      id={cafe.value}
                      value={cafe.value}
                      checked={selectedCafe === cafe.value}
                      onChange={(e) => setSelectedCafe(e.target.value)}
                    />
                    <label className="form-check-label" htmlFor={cafe.value}>
                      {cafe.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Loading...
            </>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {warning && (
        <div className="alert alert-warning" role="alert">
          {warning}
        </div>
      )}

      {!loading && !error && (!data || data.length === 0) && (
        <div className="alert alert-info text-center" role="alert">
          No data available for this month
        </div>
      )}

      {!loading && !error && data && data.length > 0 && dates.length > 0 && (
        <div className="card shadow">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead className="table-primary">
                  {/* Combined view: band the staff columns by brand, so each
                      cafe's people are grouped and labelled separately. */}
                  {isCombined && (
                    <tr>
                      <th className="text-start fw-semibold">Brand</th>
                      {cafeGroups.map((group, idx) => (
                        <th
                          key={`${group.cafe}-${idx}`}
                          colSpan={group.count}
                          className="text-center fw-bold border-start border-2"
                        >
                          {group.cafe}
                          <div
                            className="fw-normal"
                            style={{ fontSize: "11px" }}
                          >
                            {(cafeTotals[group.cafe] || 0).toFixed(2)} hrs
                          </div>
                        </th>
                      ))}
                      <th className="text-center bg-primary bg-opacity-25"></th>
                    </tr>
                  )}
                  <tr>
                    <th className="text-start fw-semibold">Row Labels</th>
                    {employees.map((emp, idx) => (
                      <th
                        key={emp}
                        className={`text-center fw-semibold${
                          startsBrand(idx) ? " border-start border-2" : ""
                        }`}
                      >
                        {columnMeta[emp]?.name || emp}
                      </th>
                    ))}
                    {/* <th className="text-center fw-semibold">(blank)</th> */}
                    <th className="text-center fw-semibold bg-primary bg-opacity-25">
                      Grand Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date, idx) => (
                    <tr key={date}>
                      <td className="fw-medium">{formatDate(date)}</td>
                      {employees.map((emp, idx) => {
                        const key = `${date}_${emp}`;
                        const hours = tableData[key];
                        return (
                          <td
                            key={emp}
                            className={`text-center${
                              startsBrand(idx) ? " border-start border-2" : ""
                            }`}
                          >
                            {hours > 0 ? hours : ""}
                          </td>
                        );
                      })}
                      {/* <td className="text-center"></td> */}
                      <td className="text-center fw-semibold bg-light">
                        {totals.byDate && totals.byDate[date]
                          ? totals.byDate[date].toFixed(2)
                          : "0.00"}
                      </td>
                    </tr>
                  ))}
                  <tr className="table-primary">
                    {/* <td className="fw-bold">(blank)</td> */}
                    {employees.map((emp) => (
                      <td key={emp} className="text-center"></td>
                    ))}
                    {/* <td className="text-center"></td>
                    <td className="text-center"></td> */}
                  </tr>
                  <tr className="table-primary fw-bold">
                    <td>Grand Total</td>
                    {employees.map((emp, idx) => (
                      <td
                        key={emp}
                        className={`text-center${
                          startsBrand(idx) ? " border-start border-2" : ""
                        }`}
                      >
                        {totals.byEmployee && totals.byEmployee[emp]
                          ? totals.byEmployee[emp].toFixed(2)
                          : "0.00"}
                      </td>
                    ))}
                    {/* <td className="text-center"></td> */}
                    <td className="text-center">{grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {isCombined && (
            <div className="card-footer bg-white">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <span className="fw-semibold">Hours by brand:</span>
                {allCafeDBs.map((cafe) => (
                  <span key={cafe.value} className="badge bg-light text-dark">
                    {cafe.label}:{" "}
                    <strong>{(cafeTotals[cafe.label] || 0).toFixed(2)}</strong>
                  </span>
                ))}
                <span className="badge bg-primary ms-auto">
                  All brands: <strong>{grandTotal.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimesheetSB;
