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
  const year = date.getFullYear();
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedType, setSelectedType] = useState("");

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

  const calculateTotalAmount = () => {
    return filteredData.reduce((total, record) => {
      const amount = parseFloat(record.amount) || 0;
      return total + amount;
    }, 0);
  };

  const formatAmount = (amount) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const downloadExcel = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Expenses</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #f8f9fa; font-weight: bold;">
            <th>id</th>  
            <th>Month Date</th>
              <th>Day</th>
              <th>Type</th>
              <th>Company</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Remarks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredData.forEach((record) => {
      const status =
        record.is_approved === true ||
        record.is_approved === 1 ||
        record.is_approved === "1"
          ? "Approved"
          : record.is_approved === false ||
            record.is_approved === 0 ||
            record.is_approved === "0"
          ? "Rejected"
          : "Pending";

      tableHTML += `
        <tr>
         <td>${record.id || ""}</td>
          <td>${record.month_date || ""}</td>
          <td>${days[record.day] || ""}</td>
          <td>${record.expense_type_name || ""}</td>
          <td>${record.company || ""}</td>
          <td>${record.vendor || ""}</td>
          <td>RM ${formatAmount(parseFloat(record.amount || 0))}</td>
          <td>${record.remarks || ""}</td>
          <td>${status}</td>
        </tr>
      `;
    });

    tableHTML += `
          <tr style="background-color: #d1ecf1; font-weight: bold;">
           
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `expense_report_${selectedMonth}_${selectedYear}.xls`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const monthvalue = localStorage.getItem("month");
    const yearvalue = localStorage.getItem("year");
    if (monthvalue) {
      fetchData(monthvalue, yearvalue);
      setSelectedMonth(monthvalue);
      setSelectedYear(yearvalue);
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
  }, [data, filterValues, selectedType]);

  const fetchData = (month, year) => {
    setLoading(true);
    fetch(
      "http://121.121.232.54:88/amazon-cafe/fetchExpenseData.php?month=" +
        month +
        "&year=" +
        year
    )
      .then((response) => response.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setFilteredData(fetchedData);
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

  const handleApproval = async (record, isApproved, e) => {
    e.stopPropagation();

    const action = isApproved ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this claim?`)) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/amazon-cafe/daily_expenditure.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "approve",
            id: record.id,
            is_approved: isApproved,
            username: localStorage.getItem("user"),
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Claim ${action}d successfully`);

        setData((prevData) =>
          prevData.map((item) =>
            item.id === record.id ? { ...item, is_approved: isApproved } : item
          )
        );
      } else {
        alert(result.error || `Failed to ${action} claim`);
      }
    } catch (error) {
      console.error("Error updating approval:", error);
      alert("Error updating approval status");
    }
  };

  const handleReject = async (record, e) => {
    e.stopPropagation();

    if (
      !window.confirm(
        `Are you sure you want to reject and delete this claim for "${
          record.vendor
        }" with amount RM ${formatAmount(parseFloat(record.amount || 0))}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/amazon-cafe/delete_daily_expenditure.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: record.id }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert("Record rejected and deleted successfully");

        // Remove the record from the data
        setData((prevData) => prevData.filter((item) => item.id !== record.id));
      } else {
        alert(result.error || "Failed to delete record");
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Network error");
    }
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

    if (selectedType) {
      filtered = filtered.filter(
        (record) => record.expense_type_name === selectedType
      );
    }

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
    setSelectedType("");
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  const columns = [
    { key: "month_date", label: "Month Date" },
    { key: "day", label: "Day" },
    { key: "expense_type_name", label: "Type" },
    { key: "company", label: "Company" },
    { key: "vendor", label: "Vendor" },
    { key: "amount", label: "Amount" },
    { key: "remarks", label: "Remarks" },
    { key: "status", label: "Status" },
  ];

  const filterableColumns = [{ key: "month_date", label: "Month Date" }];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
            <button
              className="btn btn-primary"
              onClick={downloadExcel}
              title="Download as Excel"
            >
              <i className="bi bi-file-earmark-excel me-2"></i>
              Download Excel
            </button>
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
                  {filterableColumns.map((column) => (
                    <div className="col" key={`filter-${column.key}`}>
                      <div className="form-floating">
                        <input
                          type="date"
                          className="form-control"
                          id={`filter-${column.key}`}
                          placeholder={column.label}
                          value={filterValues[column.key] || ""}
                          onChange={(e) =>
                            handleFilterChange(column.key, e.target.value)
                          }
                        />
                        <label htmlFor={`filter-${column.key}`}>
                          {column.label}
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="col">
                    <div className="form-floating">
                      <select
                        className="form-select"
                        id="monthSelect"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                      >
                        <option value="">Select month</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                      <label htmlFor="monthSelect">Month</label>
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
                        <option value="">Select Year</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                      </select>
                      <label htmlFor="yearSelect">Year</label>
                    </div>
                  </div>
                  <div className="col">
                    <div className="form-floating">
                      <select
                        className="form-select"
                        id="typeSelect"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                      >
                        <option value="">All Types</option>
                        <option value="Rental">Rental</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Stock">Stock</option>
                        <option value="Logistik">Logistik</option>
                        <option value="Claim">Claim</option>
                        <option value="Salary">Salary</option>
                        <option value="Others">Others</option>
                      </select>
                      <label htmlFor="typeSelect">Type</label>
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
                      key={record.id}
                      onClick={() => onRowClick(record)}
                      style={{ cursor: "pointer" }}
                    >
                      {columns.map((column) => {
                        if (column.key === "month_date") {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              {record[column.key]}
                            </td>
                          );
                        } else if (column.key === "day") {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              {days[record[column.key]]}
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
                        } else if (column.key === "status") {
                          const user = localStorage.getItem("user");

                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {record.is_approved === true ||
                              record.is_approved === 1 ||
                              record.is_approved === "1" ? (
                                <span className="badge bg-success">
                                  Approved
                                </span>
                              ) : (
                                (user === "admin" || user === "manager") && (
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className="btn btn-success btn-sm"
                                      onClick={(e) =>
                                        handleApproval(record, true, e)
                                      }
                                      title="Approve"
                                    >
                                      ✓ Approve
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={(e) => handleReject(record, e)}
                                      title="Reject"
                                    >
                                      ✗ Reject
                                    </button>
                                  </div>
                                )
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
                  <td></td>
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
