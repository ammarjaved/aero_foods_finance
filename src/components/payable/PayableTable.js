// src/PayableTable.js
import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function PayableTable({ onRowClick }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(31);
  const [filterValues, setFilterValues] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  const date = new Date();
  const monthIndex = date.getMonth();
  const monthNumber = monthIndex + 1;
  const currentYear = date.getFullYear();

  // Load filters from localStorage on component mount
  const loadFiltersFromStorage = () => {
    try {
      const savedFilters = localStorage.getItem("payableTableFilters");
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilterValues(parsedFilters);
        return parsedFilters;
      }
    } catch (error) {
      console.error("Error loading filters from localStorage:", error);
    }
    return { year: currentYear.toString(), month: monthNumber.toString() };
  };

  // Save filters to localStorage
  const saveFiltersToStorage = (filters) => {
    try {
      localStorage.setItem("payableTableFilters", JSON.stringify(filters));
    } catch (error) {
      console.error("Error saving filters to localStorage:", error);
    }
  };

  // Calculate total amount from filtered data
  const calculateTotalAmount = () => {
    return filteredData.reduce((total, record) => {
      const amount = parseFloat(record.due_amount) || 0;
      return total + amount;
    }, 0);
  };

  // Format number with commas
  const formatAmount = (amount) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Extract year and month from date string
  const extractDateParts = (dateString) => {
    if (!dateString) return { year: null, month: null };

    try {
      let year, month;

      if (dateString.includes("/")) {
        const parts = dateString.split("/");
        if (parts.length === 3) {
          month = parts[0];
          year = parts[2];
        }
      } else if (dateString.includes("-")) {
        const parts = dateString.split("-");
        if (parts.length === 3) {
          year = parts[0];
          month = parts[1].replace(/^0/, "");
        }
      }

      return {
        year: year ? year.toString() : null,
        month: month ? month.toString() : null,
      };
    } catch (error) {
      console.error("Error extracting date parts:", dateString, error);
      return { year: null, month: null };
    }
  };

  const getUniqueYears = () => {
    const years = data
      .map((record) => {
        const dateParts = extractDateParts(
          record.date || record.payment_due_date
        );
        return dateParts.year;
      })
      .filter((year) => year)
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => b - a);
    return years;
  };

  const getUniqueMonths = () => {
    return [
      { value: "1", label: "January" },
      { value: "2", label: "February" },
      { value: "3", label: "March" },
      { value: "4", label: "April" },
      { value: "5", label: "May" },
      { value: "6", label: "June" },
      { value: "7", label: "July" },
      { value: "8", label: "August" },
      { value: "9", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ];
  };

  useEffect(() => {
    const savedFilters = loadFiltersFromStorage();
    setFilterValues(savedFilters);
    fetchData();

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

  const fetchData = () => {
    setLoading(true);
    // Replace with your actual API endpoint
    fetch("http://121.121.232.54:88/aero-foods/payable.php")
      .then((response) => response.json())
      .then((fetchedData) => {
        const cleanedData = fetchedData.results.map((record) => ({
          ...record,
          company: record.company ? record.company.trim() : "",
          payment_to: record.payment_to ? record.payment_to.trim() : "",
        }));

        setData(cleanedData);
        setFilteredData(cleanedData);
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
        if (key === "year") {
          const filterValue = value;
          filtered = filtered.filter((record) => {
            const dateParts = extractDateParts(
              record.date || record.payment_due_date
            );
            return dateParts.year === filterValue;
          });
        } else if (key === "month") {
          const filterValue = value;
          filtered = filtered.filter((record) => {
            const dateParts = extractDateParts(
              record.date || record.payment_due_date
            );
            return dateParts.month === filterValue;
          });
        }
      }
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => {
      const newFilters = {
        ...prev,
        [key]: value,
      };
      saveFiltersToStorage(newFilters);
      return newFilters;
    });
  };

  const clearFilters = () => {
    const defaultFilters = {
      year: currentYear.toString(),
      month: monthNumber.toString(),
    };
    setFilterValues(defaultFilters);
    saveFiltersToStorage(defaultFilters);
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  const columns = [
    { key: "date", label: "Date" },
    { key: "company", label: "Company" },
    { key: "payment_to", label: "Payment To" },
    { key: "payment_details", label: "Payment Details" },
    { key: "due_amount", label: "Due Amount" },
    { key: "payment_due_date", label: "Payment Due Date" },
    { key: "payment_type", label: "Payment Type" },
    { key: "payment_status", label: "Payment Status" },
  ];

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

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

  const totalAmount = calculateTotalAmount();

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
          <div className="alert alert-info d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-0">
                <i className="bi bi-calculator me-2"></i>
                Total Amount:{" "}
                <span className="fw-bold">RM {formatAmount(totalAmount)}</span>
              </h5>
              <small className="text-muted">
                Based on {filteredData.length} record(s){" "}
                {hasActiveFilters && "(filtered)"}
              </small>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <button
                  className="btn btn-sm btn-link p-0 me-2"
                  onClick={toggleFilterPanel}
                  aria-expanded={isFilterPanelOpen}
                  aria-controls="filterPanel"
                >
                  <i
                    className={`bi ${
                      isFilterPanelOpen ? "bi-chevron-down" : "bi-chevron-right"
                    }`}
                  ></i>
                </button>
                <h5 className="mb-0">
                  Filters{" "}
                  {hasActiveFilters && (
                    <span className="badge bg-primary ms-2">Active</span>
                  )}
                </h5>
              </div>
              <div>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
            {isFilterPanelOpen && (
              <div className="card-body" id="filterPanel">
                <div className="row row-cols-1 row-cols-md-2 g-2">
                  <div className="col">
                    <div className="form-floating">
                      <select
                        className="form-select"
                        id="filter-year"
                        value={filterValues.year || ""}
                        onChange={(e) =>
                          handleFilterChange("year", e.target.value)
                        }
                      >
                        <option value="">All Years</option>
                        {getUniqueYears().map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="filter-year">Year</label>
                    </div>
                  </div>

                  <div className="col">
                    <div className="form-floating">
                      <select
                        className="form-select"
                        id="filter-month"
                        value={filterValues.month || ""}
                        onChange={(e) =>
                          handleFilterChange("month", e.target.value)
                        }
                      >
                        <option value="">All Months</option>
                        {getUniqueMonths().map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="filter-month">Month</label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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

          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => onRowClick(record)}
                      style={{ cursor: "pointer" }}
                    >
                      {columns.map((column) => {
                        if (column.key === "due_amount") {
                          return (
                            <td key={`${record.id}-${column.key}`}>
                              RM{" "}
                              {formatAmount(
                                parseFloat(record[column.key] || 0)
                              )}
                            </td>
                          );
                        } else if (column.key === "payment_status") {
                          return (
                            <td key={`${record.id}-${column.key}`}>
                              <span
                                className={`badge ${
                                  record[column.key] === "Done"
                                    ? "bg-success"
                                    : record[column.key] === "Pending"
                                    ? "bg-warning text-dark"
                                    : "bg-danger"
                                }`}
                              >
                                {record[column.key]}
                              </span>
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
                    <td colSpan={columns.length} className="text-center">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="table-info">
                  <td colSpan={4} className="text-end fw-bold">
                    Total:
                  </td>
                  <td className="fw-bold">RM {formatAmount(totalAmount)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
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
                        style={{ backgroundColor: "#007bff" }}
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
        </>
      )}
    </div>
  );
}

export default PayableTable;
