import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function ExpenseTable({ onRowClick }) {
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
  const [selectedMonth, setSelectedMonth] = useState(monthNumber);

  // Load filters from localStorage on component mount
  const loadFiltersFromStorage = () => {
    try {
      const savedFilters = localStorage.getItem("expenseTableFilters");
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilterValues(parsedFilters);
        console.log("Loaded filters from localStorage:", parsedFilters);
        return parsedFilters;
      }
    } catch (error) {
      console.error("Error loading filters from localStorage:", error);
    }
    return {};
  };

  // Save filters to localStorage
  const saveFiltersToStorage = (filters) => {
    try {
      localStorage.setItem("expenseTableFilters", JSON.stringify(filters));
      console.log("Saved filters to localStorage:", filters);
    } catch (error) {
      console.error("Error saving filters to localStorage:", error);
    }
  };

  const handleMonthChange = (e) => {
    const monthValue = e.target.value;
    localStorage.setItem("month", monthValue);
    setSelectedMonth(monthValue);
    fetchData(monthValue);
  };

  // Calculate total amount from filtered data
  const calculateTotalAmount = () => {
    return filteredData.reduce((total, record) => {
      const amount = parseFloat(record.amount) || 0;
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
        // Handle MM/DD/YYYY format
        const parts = dateString.split("/");
        if (parts.length === 3) {
          month = parts[0];
          year = parts[2];
        }
      } else if (dateString.includes("-")) {
        // Handle YYYY-MM-DD format
        const parts = dateString.split("-");
        if (parts.length === 3) {
          year = parts[0];
          month = parts[1].replace(/^0/, ""); // Remove leading zero
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

  // Get unique values for dropdown filters
  const getUniqueCompanies = () => {
    const companies = data
      .map((record) => record.company)
      .filter((company) => company && company.trim() !== "")
      .map((company) => company.trim())
      .filter((company, index, arr) => arr.indexOf(company) === index)
      .sort();
    return companies;
  };

  const getUniqueYears = () => {
    const years = data
      .map((record) => {
        const dateParts = extractDateParts(record.month_date);
        return dateParts.year;
      })
      .filter((year) => year)
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => b - a); // Sort descending

    console.log("Unique years found:", years);
    return years;
  };

  const getUniqueExpenseTypes = () => {
    const expenseTypes = data
      .map((record) => record.expense_type_name)
      .filter((type) => type && type.trim() !== "")
      .map((type) => type.trim())
      .filter((type, index, arr) => arr.indexOf(type) === index)
      .sort();

    console.log("Unique expense types found:", expenseTypes);
    return expenseTypes;
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

  // Subscribe to a custom event for new records
  useEffect(() => {
    const savedFilters = loadFiltersFromStorage();
    const monthvalue = localStorage.getItem("month");
    if (monthvalue) {
      fetchData(monthvalue);
      setSelectedMonth(monthvalue);
    } else {
      fetchData(selectedMonth);
    }

    window.addEventListener("newRecordAdded", handleNewRecord);
    window.addEventListener("recordUpdated", handleRecordUpdate);

    return () => {
      window.removeEventListener("newRecordAdded", handleNewRecord);
      window.removeEventListener("recordUpdated", handleRecordUpdate);
    };
  }, []);

  // Apply filters when data or filter values change
  useEffect(() => {
    console.log("useEffect triggered - applying filters");
    console.log("Data length:", data.length);
    console.log("Filter values:", filterValues);
    applyFilters();
  }, [data, filterValues]);

  const fetchData = (month) => {
    setLoading(true);
    fetch("http://121.121.232.54:88/aero-foods/get_all_sds_expenditure.php")
      .then((response) => response.json())
      .then((fetchedData) => {
        const cleanedData = fetchedData.results.map((record) => ({
          ...record,
          company: record.company ? record.company.trim() : "",
          vendor: record.vendor ? record.vendor.trim() : "",
        }));

        setData(cleanedData);
        setFilteredData(cleanedData);
        setLoading(false);
        console.log("Sample data:", cleanedData.slice(0, 5));
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

  // Apply filters to the data
  const applyFilters = () => {
    let filtered = [...data];

    console.log("Original data count:", data.length);
    console.log("Current filter values:", filterValues);

    // Apply non-date filters first
    Object.entries(filterValues).forEach(([key, value]) => {
      if (
        value &&
        value.trim() !== "" &&
        key !== "fromDate" &&
        key !== "toDate"
      ) {
        console.log(`Applying filter: ${key} = "${value}"`);

        if (key === "company") {
          // Exact match for company dropdown
          const filterValue = value.trim();
          const beforeFilter = filtered.length;

          filtered = filtered.filter((record) => {
            const recordCompany = record[key] ? record[key].trim() : "";
            const isMatch = recordCompany === filterValue;
            return isMatch;
          });

          console.log(
            `Company filter "${filterValue}": ${beforeFilter} → ${filtered.length} records`
          );
        } else if (key === "expense_type_name") {
          // Exact match for expense type dropdown
          const filterValue = value.trim();
          const beforeFilter = filtered.length;

          filtered = filtered.filter((record) => {
            const recordExpenseType = record[key] ? record[key].trim() : "";
            const isMatch = recordExpenseType === filterValue;
            return isMatch;
          });

          console.log(
            `Expense Type filter "${filterValue}": ${beforeFilter} → ${filtered.length} records`
          );
        } else if (key === "year") {
          // Year filter - extract from month_date
          const filterValue = value;
          const beforeFilter = filtered.length;

          filtered = filtered.filter((record) => {
            const dateParts = extractDateParts(record.month_date);
            const isMatch = dateParts.year === filterValue;
            return isMatch;
          });

          console.log(
            `Year filter "${filterValue}": ${beforeFilter} → ${filtered.length} records`
          );
        } else if (key === "month") {
          // Month filter - extract from month_date
          const filterValue = value;
          const beforeFilter = filtered.length;

          filtered = filtered.filter((record) => {
            const dateParts = extractDateParts(record.month_date);
            const isMatch = dateParts.month === filterValue;
            return isMatch;
          });

          console.log(
            `Month filter "${filterValue}": ${beforeFilter} → ${filtered.length} records`
          );
        } else {
          // Partial match for text filters (vendor)
          filtered = filtered.filter(
            (record) =>
              record[key] &&
              record[key].toString().toLowerCase().includes(value.toLowerCase())
          );
        }
      }
    });

    // Apply date range filter
    const fromDate = filterValues.fromDate;
    const toDate = filterValues.toDate;

    if (fromDate || toDate) {
      console.log("Applying date filters:");
      console.log("From date:", fromDate);
      console.log("To date:", toDate);

      const beforeDateFilter = filtered.length;

      filtered = filtered.filter((record) => {
        const recordDate = record.month_date;
        if (!recordDate) {
          return false;
        }

        let normalizedRecordDate = recordDate;
        if (recordDate.includes("/")) {
          const parts = recordDate.split("/");
          if (parts.length === 3) {
            normalizedRecordDate = `${parts[2]}-${parts[0].padStart(
              2,
              "0"
            )}-${parts[1].padStart(2, "0")}`;
          }
        }

        let passesFilter = true;

        if (fromDate) {
          passesFilter = passesFilter && normalizedRecordDate >= fromDate;
        }

        if (toDate) {
          passesFilter = passesFilter && normalizedRecordDate <= toDate;
        }

        return passesFilter;
      });

      console.log(
        `Date range filter applied: ${beforeDateFilter} → ${filtered.length} records`
      );
    }

    console.log(`Final filtered data count: ${filtered.length}`);
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  // Handle filter input change
  const handleFilterChange = (key, value) => {
    console.log(`Filter changed: ${key} = "${value}"`);
    setFilterValues((prev) => {
      const newFilters = {
        ...prev,
        [key]: value,
      };
      console.log("New filter values:", newFilters);
      saveFiltersToStorage(newFilters);
      return newFilters;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterValues({});
    localStorage.removeItem("expenseTableFilters");
    console.log("Cleared all filters and localStorage");
  };

  // Toggle filter panel
  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  // Get day name from date string
  const getDayName = (dateString) => {
    if (!dateString) return "";

    try {
      let date;
      if (dateString.includes("/")) {
        // Handle MM/DD/YYYY format
        const parts = dateString.split("/");
        if (parts.length === 3) {
          // JavaScript Date expects month as 0-indexed
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      } else if (dateString.includes("-")) {
        // Handle YYYY-MM-DD format
        date = new Date(dateString);
      }

      if (date && !isNaN(date.getTime())) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return days[date.getDay()];
      }
    } catch (error) {
      console.error("Error parsing date:", dateString, error);
    }

    return "";
  };

  // Column definitions
  const columns = [
    { key: "month_date", label: "Month Date" },
    { key: "day", label: "Day" },
    { key: "company", label: "Company" },
    { key: "vendor", label: "Vendor" },
    { key: "amount", label: "Amount" },
    { key: "expense_type_name", label: "Expense Type" },
    { key: "remarks", label: "Remarks" },
  ];

  // Filterable columns - updated with year, month, and vendor
  const filterableColumns = [
    { key: "company", label: "Company", type: "dropdown" },
    { key: "year", label: "Year", type: "dropdown" },
    { key: "month", label: "Month", type: "dropdown" },
    { key: "expense_type_name", label: "Expense Type", type: "dropdown" },
    { key: "vendor", label: "Vendor", type: "text" },
  ];

  // Date range filters
  const dateRangeFilters = [
    { key: "fromDate", label: "From Date", type: "date" },
    { key: "toDate", label: "To Date", type: "date" },
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

  // Check if any filters are active
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
          {/* Total Amount Display */}
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
                  {/* Date Range Filters */}
                  {dateRangeFilters.map((filter) => (
                    <div className="col" key={`filter-${filter.key}`}>
                      <div className="form-floating">
                        <input
                          type="date"
                          className="form-control"
                          id={`filter-${filter.key}`}
                          placeholder={filter.label}
                          value={filterValues[filter.key] || ""}
                          onChange={(e) =>
                            handleFilterChange(filter.key, e.target.value)
                          }
                        />
                        <label htmlFor={`filter-${filter.key}`}>
                          {filter.label}
                        </label>
                      </div>
                    </div>
                  ))}

                  {/* Other Filters */}
                  {filterableColumns.map((column) => (
                    <div className="col" key={`filter-${column.key}`}>
                      <div className="form-floating">
                        {column.type === "dropdown" ? (
                          <select
                            className="form-select"
                            id={`filter-${column.key}`}
                            value={filterValues[column.key] || ""}
                            onChange={(e) =>
                              handleFilterChange(column.key, e.target.value)
                            }
                          >
                            <option value="">All {column.label}s</option>
                            {column.key === "company" &&
                              getUniqueCompanies().map((company) => (
                                <option key={company} value={company}>
                                  {company}
                                </option>
                              ))}
                            {column.key === "year" &&
                              getUniqueYears().map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            {column.key === "month" &&
                              getUniqueMonths().map((month) => (
                                <option key={month.value} value={month.value}>
                                  {month.label}
                                </option>
                              ))}
                            {column.key === "expense_type_name" &&
                              getUniqueExpenseTypes().map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            id={`filter-${column.key}`}
                            placeholder={column.label}
                            value={filterValues[column.key] || ""}
                            onChange={(e) =>
                              handleFilterChange(column.key, e.target.value)
                            }
                          />
                        )}
                        <label htmlFor={`filter-${column.key}`}>
                          {column.label}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} style={column.headerStyle || {}}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <tr
                      key={`${record.id}_${record.company}`}
                      onClick={() => onRowClick(record)}
                      style={{ cursor: "pointer" }}
                    >
                      {columns.map((column) => {
                        if (column.key === "day") {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              {getDayName(record.month_date)}
                            </td>
                          );
                        } else if (column.key === "amount") {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              RM{" "}
                              {formatAmount(
                                parseFloat(record[column.key] || 0)
                              )}
                            </td>
                          );
                        } else {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              {record[column.key]}
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
                  <td colSpan={columns.length - 3} className="text-end fw-bold">
                    Total:
                  </td>
                  <td className="fw-bold">RM {formatAmount(totalAmount)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination controls - bottom */}
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
        </>
      )}
    </div>
  );
}

export default ExpenseTable;
