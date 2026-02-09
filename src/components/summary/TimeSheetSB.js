import React, { useState, useEffect } from "react";

const TimesheetSB = ({ month = 11 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCafe, setSelectedCafe] = useState("aero_foods_finance");

  const cafes = [
    { value: "ojim_finance", label: "Ojim Cafe" },
    { value: "aero_foods_finance", label: "Mixue" },
    { value: "amazon_cafe_finance", label: "D' Amazon Cafe" },
    { value: "amazon_cafe_finance_lyp", label: "D' Amazon Cafe LYP" },
    { value: "abe_yus_finance", label: "Abe Yus" },
  ];

  useEffect(() => {
    fetchData();
  }, [month, selectedCafe]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://121.121.232.54:88/aero-foods/timesheet_sb.php?month=${month}&db=${selectedCafe}`,
      );
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
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
      };
    }

    try {
      const dates = [
        ...new Set(data.map((item) => item?.month_date).filter(Boolean)),
      ].sort();

      const employees = [
        ...new Set(data.map((item) => item?.name).filter(Boolean)),
      ].sort();

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

        const key = `${item.month_date}_${item.name}`;
        const hours = parseFloat(item.total_hr) || 0;
        tableData[key] = hours;

        if (totals.byDate[item.month_date] !== undefined) {
          totals.byDate[item.month_date] += hours;
        }
        if (totals.byEmployee[item.name] !== undefined) {
          totals.byEmployee[item.name] += hours;
        }
      });

      return { dates, employees, tableData, totals };
    } catch (err) {
      console.error("Error processing data:", err);
      return {
        dates: [],
        employees: [],
        tableData: {},
        totals: { byDate: {}, byEmployee: {} },
      };
    }
  };

  const processedData = processData();
  const {
    dates = [],
    employees = [],
    tableData = {},
    totals = { byDate: {}, byEmployee: {} },
  } = processedData;

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
          Timesheet - {getMonthDisplay()} 2025
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
                  <tr>
                    <th className="text-start fw-semibold">Row Labels</th>
                    {employees.map((emp) => (
                      <th key={emp} className="text-center fw-semibold">
                        {emp}
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
                      {employees.map((emp) => {
                        const key = `${date}_${emp}`;
                        const hours = tableData[key];
                        return (
                          <td key={emp} className="text-center">
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
                    {employees.map((emp) => (
                      <td key={emp} className="text-center">
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
        </div>
      )}
    </div>
  );
};

export default TimesheetSB;
