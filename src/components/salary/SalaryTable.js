import React, { useEffect, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function SalaryTable({ onRowClick }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(31);
  const [filterValues, setFilterValues] = useState({});
  const [filteredData, setFilteredData] = useState([]);

  const date = new Date();
  const currentYear = date.getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleYearChange = (e) => {
    const yearValue = e.target.value;
    localStorage.setItem("year", yearValue);
    setSelectedYear(yearValue);
    fetchData(yearValue);
  };

  // Calculate row total for a single record
  const calculateRowTotal = (record) => {
    const companyFields = ["mixue", "abeyus", "dac", "ojim", "sds_hq"];
    return companyFields.reduce((total, field) => {
      const value = parseFloat(record[field]) || 0;
      return total + value;
    }, 0);
  };

  // Calculate column total for all records
  const calculateColumnTotal = (fieldName) => {
    return data.reduce((total, record) => {
      const value = parseFloat(record[fieldName]) || 0;
      return total + value;
    }, 0);
  };

  // Calculate grand total of all amounts
  const calculateGrandTotal = () => {
    const companyFields = ["mixue", "abeyus", "dac", "ojim", "sds_hq"];
    return companyFields.reduce((grandTotal, field) => {
      return grandTotal + calculateColumnTotal(field);
    }, 0);
  };

  // Format number with commas
  const formatAmount = (amount) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Memoized fetch function to prevent unnecessary re-renders
  const monthOrder = [
    "JAN",
    "FEB",
    "MAC",
    "APR",
    "MAY",
    "JUNE",
    "JULY",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  const fetchData = useCallback((year) => {
    setLoading(true);
    fetch(`http://121.121.232.54:88/aero-foods/get_all_salary.php?year=${year}`)
      .then((response) => response.json())
      .then((fetchedData) => {
        const cleanedData = fetchedData.results.map((record) => ({
          ...record,
          year: record.year ? record.year.toString().trim() : "",
          month: record.month ? record.month.toString().trim() : "",
        }));

        const sortedData = cleanedData.sort((a, b) => {
          const yearA = parseInt(a.year) || 0;
          const yearB = parseInt(b.year) || 0;
          if (yearA !== yearB) {
            return yearA - yearB;
          }

          const monthAIndex = monthOrder.indexOf(a.month?.toUpperCase()) ?? -1;
          const monthBIndex = monthOrder.indexOf(b.month?.toUpperCase()) ?? -1;
          return monthAIndex - monthBIndex;
        });

        setData(sortedData);
        setLoading(false);

        console.log("Sample data:", cleanedData.slice(0, 5));
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [data, filterValues]);

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

  // Handler for new record event
  const handleNewRecord = useCallback((event) => {
    const newRecord = event.detail;
    console.log("New record added:", newRecord);

    // Add new record to the beginning of the data array
    setData((prevData) => {
      // Check if record already exists to prevent duplicates
      const exists = prevData.some((record) => record.id === newRecord.id);
      if (exists) {
        return prevData;
      }
      return [newRecord, ...prevData];
    });
  }, []);

  // Handler for updated record event
  const handleRecordUpdate = useCallback((event) => {
    const updatedRecord = event.detail;
    console.log("Record updated:", updatedRecord);

    setData((prevData) =>
      prevData.map((record) =>
        record.id === updatedRecord.id
          ? { ...record, ...updatedRecord }
          : record
      )
    );
  }, []);

  // Handler for deleted record event
  const handleRecordDelete = useCallback((event) => {
    const { id } = event.detail;
    console.log("Record deleted:", id);

    setData((prevData) => prevData.filter((record) => record.id !== id));
  }, []);

  // Handler for general table refresh
  const handleTableRefresh = useCallback(() => {
    console.log("Table refresh requested");
    const yearvalue = localStorage.getItem("year") || selectedYear;
    fetchData(yearvalue);
  }, [fetchData, selectedYear]);

  useEffect(() => {
    const yearvalue = localStorage.getItem("year");

    if (yearvalue) {
      fetchData(yearvalue);
      setSelectedYear(yearvalue);
    } else {
      fetchData(selectedYear);
    }

    // Set up event listeners
    window.addEventListener("newRecordAdded", handleNewRecord);
    window.addEventListener("recordUpdated", handleRecordUpdate);
    window.addEventListener("recordDeleted", handleRecordDelete);
    window.addEventListener("refreshTable", handleTableRefresh);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener("newRecordAdded", handleNewRecord);
      window.removeEventListener("recordUpdated", handleRecordUpdate);
      window.removeEventListener("recordDeleted", handleRecordDelete);
      window.removeEventListener("refreshTable", handleTableRefresh);
    };
  }, [
    handleNewRecord,
    handleRecordUpdate,
    handleRecordDelete,
    handleTableRefresh,
    fetchData,
    selectedYear,
  ]);

  // Column definitions - updated for new data structure
  const columns = [
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    {
      key: "mixue",
      label: "Mixue",
      isAmount: true,
    },
    {
      key: "abeyus",
      label: "Abe-Yus",
      isAmount: true,
    },
    {
      key: "dac",
      label: "DAC",
      isAmount: true,
    },
    {
      key: "ojim",
      label: "Ojim",
      isAmount: true,
    },
    {
      key: "sds_hq",
      label: "SDS HQ",
      isAmount: true,
    },
    {
      key: "total",
      label: "Total",
      isAmount: true,
      isTotal: true,
    },
  ];

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Previous and next page handlers
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

  // Manual refresh button
  const handleManualRefresh = () => {
    handleTableRefresh();
  };

  const hasActiveFilters = Object.values(filterValues).some(
    (value) => value && value.trim() !== ""
  );

  // Generate year options (current year and previous 10 years)
  const generateYearOptions = () => {
    const years = [];
    for (let i = 0; i <= 10; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  return (
    <div className="container-fluid mt-2">
      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Section */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">
                Filters
                {hasActiveFilters && (
                  <span className="badge bg-primary ms-2">Active</span>
                )}
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-2">
                  <label htmlFor="yearSelect" className="form-label">
                    Year
                  </label>
                  <select
                    className="form-select"
                    id="yearSelect"
                    value={selectedYear}
                    onChange={handleYearChange}
                  >
                    {generateYearOptions().map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label htmlFor="filterMonth" className="form-label">
                    Filter Month
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="filterMonth"
                    placeholder="Search month..."
                    value={filterValues.month || ""}
                    onChange={(e) =>
                      handleFilterChange("month", e.target.value)
                    }
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  {hasActiveFilters && (
                    <button
                      className="btn btn-outline-secondary w-100"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              Showing {indexOfFirstRecord + 1} to{" "}
              {Math.min(indexOfLastRecord, filteredData.length)} of{" "}
              {filteredData.length} records
            </div>
            <div className="d-flex align-items-center gap-3">
              {/* Manual refresh button */}
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleManualRefresh}
                disabled={loading}
              >
                <i className="fas fa-sync-alt"></i> Refresh
              </button>

              {/* Records per page selector */}
              <div className="d-flex align-items-center">
                <label className="me-2">Records per page:</label>
                <select
                  className="form-select form-select-sm"
                  value={recordsPerPage}
                  onChange={(e) => {
                    setRecordsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  style={{ width: "auto" }}
                >
                  <option value={12}>12</option>
                  <option value={31}>31</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered">
              <thead className="table-dark">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={column.isTotal ? "bg-warning text-dark" : ""}
                      style={{
                        backgroundColor: column.isTotal ? "#ffc107" : "#212529",
                        color: column.isTotal ? "#000" : "#fff",
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => onRowClick && onRowClick(record)}
                      style={{ cursor: onRowClick ? "pointer" : "default" }}
                      className={onRowClick ? "table-row-hover" : ""}
                    >
                      {columns.map((column) => {
                        if (column.key === "total") {
                          const rowTotal = calculateRowTotal(record);
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              className="fw-bold"
                              style={{ backgroundColor: "#fff3cd" }}
                            >
                              RM {formatAmount(rowTotal)}
                            </td>
                          );
                        } else if (column.isAmount) {
                          const value = parseFloat(record[column.key]) || 0;
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              className={value === 0 ? "text-muted" : ""}
                            >
                              {value === 0 ? "-" : `RM ${formatAmount(value)}`}
                            </td>
                          );
                        } else {
                          return (
                            <td key={`${record.id}-${column.key}`}>
                              {record[column.key] || "-"}
                            </td>
                          );
                        }
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="text-center text-muted"
                    >
                      No records found
                      <br />
                      <small>Click "Add New Record" to get started</small>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot className="table-secondary">
                  <tr className="fw-bold">
                    <td colSpan={2} className="text-end">
                      Column Totals:
                    </td>
                    {columns.slice(2).map((column) => {
                      if (column.key === "total") {
                        return (
                          <td
                            key={column.key}
                            className="fw-bold"
                            style={{
                              backgroundColor: "#ffc107",
                              color: "#000",
                            }}
                          >
                            RM {formatAmount(calculateGrandTotal())}
                          </td>
                        );
                      } else if (column.isAmount) {
                        const columnTotal = calculateColumnTotal(column.key);
                        return (
                          <td key={column.key}>
                            RM {formatAmount(columnTotal)}
                          </td>
                        );
                      }
                      return null;
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Summary Card */}
          {filteredData.length > 0 && (
            <div className="card mt-3">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <h6>Total Records: {filteredData.length}</h6>
                  </div>
                  <div className="col-md-3">
                    <h6>
                      Grand Total: RM {formatAmount(calculateGrandTotal())}
                    </h6>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex justify-content-end">
                      {["mixue", "abeyus", "dac", "ojim", "sds_hq"].map(
                        (field) => {
                          const total = calculateColumnTotal(field);
                          const label =
                            columns.find((col) => col.key === field)?.label ||
                            field;
                          return (
                            <div key={field} className="me-3">
                              <small className="text-muted">{label}:</small>
                              <div className="fw-bold">
                                RM {formatAmount(total)}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagination controls - bottom */}
          {totalPages > 1 && (
            <nav aria-label="Page navigation" className="mt-3">
              <ul className="pagination justify-content-center">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>

                {/* Display page numbers with ellipsis for large sets */}
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
                    className="page-link"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}

      {/* Add some custom CSS for better hover effects */}
      <style jsx>{`
        .table-row-hover:hover {
          background-color: #f8f9fa !important;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default SalaryTable;
