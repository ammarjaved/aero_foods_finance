import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";

function TableMonthSummary() {
  const [data, setData] = useState([]);
  // multimonth: Added state to cache data for all months to enable multi-month chart functionality
  const [allMonthsData, setAllMonthsData] = useState({}); // Store data for all months
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(31);
  const [filterValues, setFilterValues] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showExpenseInChart, setShowExpenseInChart] = useState(true);
  const [showActualInChart, setShowActualInChart] = useState(true);

  const date = new Date();
  const monthIndex = date.getMonth();
  const monthNumber = monthIndex + 1;
  const currentYear = date.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(monthNumber);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // multimonth: Added state for managing multiple months in chart view

  const [selectedMonthsForChart, setSelectedMonthsForChart] = useState([
    `${currentYear}-${monthNumber}`,
  ]); // Multiple months for chart
  const [chartData, setChartData] = useState([]); // Combined data for chart

  const monthNames = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  const handleMonthChange = (e) => {
    const monthValue = e.target.value;
    localStorage.setItem("month", monthValue);
    setSelectedMonth(monthValue);
    fetchData(monthValue, selectedYear);
  };

  const handleYearChange = (e) => {
    const yearValue = e.target.value;
    localStorage.setItem("year", yearValue);
    setSelectedYear(yearValue);
    fetchData(selectedMonth, yearValue);
  };

  const handleAddMonthToChart = (monthYearToAdd) => {
    if (!selectedMonthsForChart.includes(monthYearToAdd) && monthYearToAdd) {
      const updatedMonths = [...selectedMonthsForChart, monthYearToAdd];
      setSelectedMonthsForChart(updatedMonths);

      const [year, month] = monthYearToAdd.split("-");
      if (!allMonthsData[monthYearToAdd]) {
        fetchMonthData(month, year);
      } else {
        updateChartData(updatedMonths);
      }
    }
  };
  const handleRemoveMonthFromChart = (monthYearToRemove) => {
    const updatedMonths = selectedMonthsForChart.filter(
      (monthYear) => monthYear !== monthYearToRemove
    );
    setSelectedMonthsForChart(updatedMonths);
    updateChartData(updatedMonths);
  };

  const fetchMonthData = async (month, year) => {
    try {
      const response = await fetch(
        `http://121.121.232.54:88/aero-foods/mon-sum-mixiue.php?month=${month}&year=${year}`
      );
      const fetchedData = await response.json();

      const processedData = fetchedData.monthly_data
        .map((item) => ({
          ...item,
          total_sales:
            parseFloat(item.total_sales) === 0
              ? null
              : parseFloat(item.total_sales),
          total_actual:
            parseFloat(item.total_actual) === 0
              ? null
              : parseFloat(item.total_actual),
          total_variance:
            parseFloat(item.total_variance) === 0
              ? null
              : parseFloat(item.total_variance),
          total_expense:
            parseFloat(item.total_expense) === 0
              ? null
              : parseFloat(item.total_expense),
          day_of_week: new Date(item.month_date).toLocaleDateString("en-US", {
            weekday: "long",
          }),
          chart_date: new Date(item.month_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          month_name: monthNames[parseInt(month)],
          year: year, // ✅ ADD THIS
          sort_date: new Date(item.month_date),
        }))
        .sort((a, b) => a.sort_date - b.sort_date);

      // Cache the data
      const cacheKey = `${year}-${month}`;
      setAllMonthsData((prev) => ({
        ...prev,
        [cacheKey]: processedData,
      }));

      // If this is the selected month and year for the table, update the main data
      if (
        parseInt(month) === parseInt(selectedMonth) &&
        parseInt(year) === parseInt(selectedYear)
      ) {
        setData(processedData);
        setFilteredData(processedData);
      }

      // DON'T call updateChartData here - let useEffect handle it
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const updateChartData = (monthYearsToShow) => {
    const combinedData = [];

    monthYearsToShow.forEach((monthYear) => {
      if (allMonthsData[monthYear]) {
        allMonthsData[monthYear].forEach((item) => {
          combinedData.push({
            ...item,
            display_date: `${item.chart_date}`,
            month_year: `${item.month_name} ${item.year}`, // ADD YEAR HERE
            full_date: item.sort_date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: monthYearsToShow.length > 1 ? "numeric" : undefined,
            }),
          });
        });
      }
    });

    combinedData.sort((a, b) => a.sort_date - b.sort_date);
    setChartData(combinedData);
  };
  useEffect(() => {
    const monthvalue = localStorage.getItem("month");
    const yearvalue = localStorage.getItem("year");
    if (monthvalue) {
      const year = yearvalue || currentYear;
      fetchData(monthvalue, year);
      setSelectedMonth(monthvalue);
      setSelectedYear(year);
      setSelectedMonthsForChart([`${year}-${monthvalue}`]);
    } else {
      fetchData(selectedMonth, selectedYear);
    }

    window.addEventListener("newRecordAdded", handleNewRecord);
    window.addEventListener("recordUpdated", handleRecordUpdate);

    return () => {
      window.removeEventListener("newRecordAdded", handleNewRecord);
      window.removeEventListener("recordUpdated", handleRecordUpdate);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [data, filterValues]);

  useEffect(() => {
    updateChartData(selectedMonthsForChart);
  }, [selectedMonthsForChart, allMonthsData]);

  // const fetchData = (month) => {
  //   setLoading(true);
  //   fetchMonthData(month).finally(() => setLoading(false));
  // };
  const fetchData = (month, year) => {
    setLoading(true);
    // Fetch data from PHP backend
    fetch(
      "http://121.121.232.54:88/aero-foods/mon-sum-mixiue.php?month=" +
        month +
        "&year=" +
        year
    )
      .then((response) => response.json())
      .then((fetchedData) => {
        // Convert string values to numbers and sort by date ascending

        const processedData = fetchedData.monthly_data
          .map((item) => ({
            ...item,
            total_sales:
              parseFloat(item.total_sales) === 0
                ? null
                : parseFloat(item.total_sales),
            total_actual:
              parseFloat(item.total_actual) === 0
                ? null
                : parseFloat(item.total_actual),
            total_variance:
              parseFloat(item.total_variance) === 0
                ? null
                : parseFloat(item.total_variance),
            total_expense:
              parseFloat(item.total_expense) === 0
                ? null
                : parseFloat(item.total_expense),
            day_of_week: new Date(item.month_date).toLocaleDateString("en-US", {
              weekday: "long",
            }),
            chart_date: new Date(item.month_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            month_name: monthNames[parseInt(month)],
            year: year, // ✅ ADD THIS
            sort_date: new Date(item.month_date),
          }))
          .sort((a, b) => new Date(a.month_date) - new Date(b.month_date));

        // Update table data
        setData(processedData);
        setFilteredData(processedData);

        // multimonth: Cache this data for the chart to enable multi-month functionality
        const cacheKey = `${year}-${month}`;
        setAllMonthsData((prev) => ({
          ...prev,
          [cacheKey]: processedData,
        }));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  };
  const handleNewRecord = (event) => {
    const newRecord = event.detail;
    setData((prevData) => [newRecord, ...prevData]);
  };

  const handleRecordUpdate = (event) => {
    const updatedRecord = event.detail;
    setData((prevData) =>
      prevData.map((record) =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
  };

  const applyFilters = () => {
    let filtered = [...data];

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value.trim() !== "") {
        filtered = filtered.filter(
          (record) =>
            record[key] &&
            record[key].toString().toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilterValues({});
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  const toggleChart = () => {
    setShowChart(!showChart);
  };

  const toggleExpenseInChart = () => {
    setShowExpenseInChart(!showExpenseInChart);
  };

  const toggleActualInChart = () => {
    setShowActualInChart(!showActualInChart);
  };

  const columns = [
    {
      key: "month_date",
      label: "Date",
      classHead: "bg-dark text-white",
      classBody: "bg-dark text-white",
    },
    {
      key: "day_of_week",
      label: "Day",
      classHead: "bg-secondary text-white",
      classBody: "bg-secondary text-white",
    },
    {
      key: "total_sales",
      label: "Total Sales",
      classHead: "bg-primary text-white",
      classBody: "bg-primary text-white",
    },
    {
      key: "total_actual",
      label: "Total Actual",
      classHead: "bg-success text-white",
      classBody: "bg-success text-white",
    },
    {
      key: "total_variance",
      label: "Variance",
      classHead: "bg-warning text-dark",
      classBody: "bg-warning text-dark",
    },
    {
      key: "total_expense",
      label: "Total Expense",
      classHead: "bg-danger text-white",
      classBody: "bg-danger text-white",
    },
  ];

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  const totals = filteredData.reduce(
    (acc, item) => {
      acc.total_sales += item.total_sales || 0;
      acc.total_actual += item.total_actual || 0;
      acc.total_variance += item.total_variance || 0;
      acc.total_expense += item.total_expense || 0;
      return acc;
    },
    { total_sales: 0, total_actual: 0, total_variance: 0, total_expense: 0 }
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const hasActiveFilters = Object.values(filterValues).some(
    (value) => value && value.trim() !== ""
  );

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    return `RM${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return "text-success";
    if (variance < 0) return "text-danger";
    return "text-muted";
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Find the data point to get additional info
      const dataPoint = chartData.find((item) => item.full_date === label);

      return (
        <div className="bg-white p-3 border rounded shadow">
          <p className="fw-bold mb-2">{`${label}${
            dataPoint ? ` (${dataPoint.month_year})` : ""
          }`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: "4px 0" }}>
              {`${
                entry.dataKey === "total_sales"
                  ? "Total Sales"
                  : entry.dataKey === "total_actual"
                  ? "Total Actual"
                  : "Total Expense"
              }: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get available months for the dropdown (excluding already selected ones)
  const availableMonthYears = [];
  for (let y = currentYear; y >= currentYear - 2; y--) {
    for (let m = 12; m >= 1; m--) {
      const key = `${y}-${m}`;
      if (!selectedMonthsForChart.includes(key)) {
        availableMonthYears.push({ key, label: `${monthNames[m]} ${y}` });
      }
    }
  }
  return (
    <div className="container-fluid mt-2 position-relative">
      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Filter section */}
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <button
                  className="btn btn-sm btn-link p-0 me-2"
                  onClick={toggleFilterPanel}
                  aria-expanded={isFilterPanelOpen}
                  aria-controls="filterPanel"
                >
                  <span style={{ fontSize: "16px" }}>
                    {isFilterPanelOpen ? "▼" : "▶"}
                  </span>
                </button>
                <h5 className="mb-0">
                  Filters
                  {hasActiveFilters && (
                    <span className="badge bg-primary ms-2">Active</span>
                  )}
                </h5>
              </div>
              <div>
                <button
                  className="btn btn-sm btn-outline-info me-2"
                  onClick={toggleChart}
                >
                  {showChart ? "Hide Chart" : "Show Chart"}
                </button>
                {hasActiveFilters && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            {isFilterPanelOpen && (
              <div className="card-body" id="filterPanel">
                <div className="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-2">
                  <div className="col">
                    <div className="form-floating">
                      <select
                        className="form-select"
                        id="monthSelect"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                      >
                        <option value="">Select month</option>
                        {Object.entries(monthNames).map(([value, name]) => (
                          <option key={value} value={value}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="monthSelect">Month (Table Data)</label>
                    </div>
                  </div>

                  <div className="col">
                    <div className="form-floating">
                      <select
                        className="form-select"
                        id="yearSelect"
                        value={selectedYear}
                        onChange={handleYearChange}
                      >
                        <option value="">Select year</option>
                        {Array.from(
                          { length: 10 },
                          (_, i) => currentYear - i
                        ).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="yearSelect">Year</label>
                    </div>
                  </div>

                  <div className="col">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="dateFilter"
                        placeholder="Filter by date"
                        value={filterValues.month_date || ""}
                        onChange={(e) =>
                          handleFilterChange("month_date", e.target.value)
                        }
                      />
                      <label htmlFor="dateFilter">Filter by Date</label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart Section */}
          {showChart && (
            <div className="card mb-3">
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Sales vs Actual vs Expense</h5>
                  <div className="d-flex align-items-center gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showExpenseToggle"
                        checked={showExpenseInChart}
                        onChange={toggleExpenseInChart}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="showExpenseToggle"
                      >
                        Show Total Expense
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showActualToggle"
                        checked={showActualInChart}
                        onChange={toggleActualInChart}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="showActualToggle"
                      >
                        Show Total Actual
                      </label>
                    </div>
                  </div>
                </div>

                {/* Month Management Controls */}
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <div className="d-flex gap-2">
                      <select
                        onChange={(e) => handleAddMonthToChart(e.target.value)}
                        value=""
                      >
                        <option value="">Add month to chart...</option>
                        {availableMonthYears.map(({ key, label }) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-8">
                    <div className="d-flex gap-1 flex-wrap">
                      <span className="small text-muted me-2">
                        Chart months:
                      </span>
                      {selectedMonthsForChart.map((monthYear) => {
                        const [year, month] = monthYear.split("-");
                        return (
                          <span
                            key={monthYear}
                            className="badge bg-primary d-flex align-items-center gap-1"
                          >
                            {monthNames[parseInt(month)]} {year}
                            {selectedMonthsForChart.length > 1 && (
                              <button
                                type="button"
                                className="btn-close btn-close-white"
                                style={{ fontSize: "0.6em" }}
                                onClick={() =>
                                  handleRemoveMonthFromChart(monthYear)
                                }
                                aria-label={`Remove ${
                                  monthNames[parseInt(month)]
                                } ${year} from chart`}
                              ></button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ width: "100%", height: "400px" }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 80,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="full_date"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval="preserveStartEnd"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value, index) => {
                          // Show every 5th tick to reduce clutter
                          if (chartData.length > 31) {
                            return index % 5 === 0 ? value : "";
                          }
                          return value;
                        }}
                      />
                      <YAxis
                        tickFormatter={(value) => `RM${value.toLocaleString()}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total_sales"
                        stroke="#0d6efd"
                        strokeWidth={2}
                        name="Total Sales"
                        dot={{ fill: "#0d6efd", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      {showActualInChart && (
                        <Line
                          type="monotone"
                          dataKey="total_actual"
                          stroke="#198754"
                          strokeWidth={2}
                          name="Total Actual"
                          dot={{ fill: "#198754", strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                      {showExpenseInChart && (
                        <Line
                          type="monotone"
                          dataKey="total_expense"
                          stroke="#dc3545"
                          strokeWidth={2}
                          name="Total Expense"
                          dot={{ fill: "#dc3545", strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      )}
                      <Brush
                        dataKey="full_date"
                        height={30}
                        stroke="#8884d8"
                        fill="#f0f0f0"
                        tickFormatter={(value) => {
                          // Show simplified format in brush
                          const date = new Date(value);
                          return date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Pagination controls - top */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              Showing {indexOfFirstRecord + 1} to{" "}
              {Math.min(indexOfLastRecord, filteredData.length)} of{" "}
              {filteredData.length} records
            </div>
            <div className="d-flex align-items-center">
              <label className="me-2">Records per page:</label>
              <select
                className="form-select form-select-sm"
                value={recordsPerPage}
                onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                style={{ width: "auto" }}
              >
                <option value={31}>31</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Main content area */}
          <div className="row">
            <div className={`col-12 } transition-all`}>
              {/* Table */}
              <div className="table-responsive shadow rounded-3">
                <table className="table table-striped table-hover table-bordered mb-0">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column.key} className={column.classHead}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.length > 0 ? (
                      currentRecords.map((record, index) => (
                        <tr
                          key={`${record.month_date}-${index}`}
                          style={{ cursor: "pointer" }}
                          className="hover-row"
                        >
                          <td className={columns[0].classBody}>
                            {record.month_date}
                          </td>
                          <td className={columns[1].classBody}>
                            {record.day_of_week}
                          </td>
                          <td className={columns[2].classBody}>
                            {formatCurrency(record.total_sales)}
                          </td>
                          <td className={columns[3].classBody}>
                            {formatCurrency(record.total_actual)}
                          </td>
                          <td
                            className={`${
                              columns[4].classBody
                            } ${getVarianceColor(record.total_variance)}`}
                          >
                            {formatCurrency(record.total_variance)}
                          </td>
                          <td className={columns[5].classBody}>
                            {record.total_expense !== null
                              ? formatCurrency(record.total_expense)
                              : "N/A"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="text-center">
                          No records found
                        </td>
                      </tr>
                    )}
                    <tr className="fw-bold bg-light">
                      <td colSpan={2} className="text-end">
                        Total
                      </td>
                      <td>{formatCurrency(totals.total_sales)}</td>
                      <td>{formatCurrency(totals.total_actual)}</td>
                      <td className={getVarianceColor(totals.total_variance)}>
                        {formatCurrency(totals.total_variance)}
                      </td>
                      <td>
                        {totals.total_expense
                          ? formatCurrency(totals.total_expense)
                          : "N/A"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pagination controls - bottom */}
              <nav aria-label="Page navigation" className="mt-3">
                <ul className="pagination justify-content-center">
                  <li
                    className={`page-item ${
                      currentPage === 1 ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      style={{ backgroundColor: "#F8D7DA" }}
                      onClick={goToPreviousPage}
                    >
                      Previous
                    </button>
                  </li>

                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNumber = index + 1;

                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 &&
                        pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <li
                          key={pageNumber}
                          className={`page-item ${
                            currentPage === pageNumber ? "active" : ""
                          }`}
                        >
                          <button
                            style={{ backgroundColor: "#E80000" }}
                            className="page-link"
                            onClick={() => paginate(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        </li>
                      );
                    } else if (
                      (pageNumber === 2 && currentPage > 3) ||
                      (pageNumber === totalPages - 1 &&
                        currentPage < totalPages - 2)
                    ) {
                      return (
                        <li key={pageNumber} className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      );
                    }
                    return null;
                  })}

                  <li
                    className={`page-item ${
                      currentPage === totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      style={{ backgroundColor: "#F8D7DA" }}
                      className="page-link"
                      onClick={goToNextPage}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TableMonthSummary;
