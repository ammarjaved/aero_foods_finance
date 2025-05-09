import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function TableWastage({ onRowClick }) {
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

  const handleMonthChange = (e) => {
    const monthValue = e.target.value;
    localStorage.setItem("month", monthValue);
    setSelectedMonth(monthValue);
    fetchData(monthValue); // Call your fetchData function with the selected month value
  };

  // Subscribe to a custom event for new records
  useEffect(() => {
    const monthvalue = localStorage.getItem("month");
    if (monthvalue) {
      fetchData(monthvalue);
      setSelectedMonth(monthvalue);
    } else {
      fetchData(selectedMonth);
    }

    // Create event listeners for record updates
    window.addEventListener("newRecordAdded", handleNewRecord);
    window.addEventListener("recordUpdated", handleRecordUpdate);

    return () => {
      // Clean up event listeners
      window.removeEventListener("newRecordAdded", handleNewRecord);
      window.removeEventListener("recordUpdated", handleRecordUpdate);
    };
  }, []);

  // Apply filters when data or filter values change
  useEffect(() => {
    applyFilters();
  }, [data, filterValues]);

  const fetchData = (month) => {
    setLoading(true);
    // Fetch data from PHP backend
    fetch(
      "http://121.121.232.54:88/aero-foods/fetch_daily_wastage.php?month=" +
        month
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

  // Handler for new record event
  const handleNewRecord = (event) => {
    const newRecord = event.detail;
    setData((prevData) => [newRecord, ...prevData]);
  };

  // Handler for updated record event
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

    // Apply each filter if it has a value
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
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle filter input change
  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterValues({});
  };

  // Toggle filter panel
  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  // Column definitions with friendly names and custom styling for specific columns
  const columns = [
    {
      key: "month_date",
      label: "Month Date",
      classHead: "bg-dark text-light",
      classBody: "bg-dark text-light",
    },
    {
      key: "day",
      label: "Day",
      classHead: "bg-dark text-light",
      classBody: "bg-dark text-light",
    },
    {
      key: "utilities",
      label: "Utilities",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "rental",
      label: "Rental",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "total_before_discount",
      label: "Wastage Amount",
      classHead: "bg-success text-light",
      classBody: "bg-success text-light text-end",
    },
    {
      key: "discount",
      label: "100% Discount Amount",
      classHead: "bg-success text-light",
      classBody: "bg-success text-light text-end",
    },
    {
      key: "final_total",
      label: "Total Discount",
      classHead: "bg-success text-light",
      classBody: "bg-success text-light text-end",
    },
    // {
    //   key: "jasmine_tea_value",
    //   label: "Jasmine Tea Value",
    //   headerStyle: { backgroundColor: "#2E86C1" },
    //   cellStyle: { backgroundColor: "#2E86C1" },
    // },
    {
      key: "jasmine_tea_wastage",
      label: "Jasmine Tea Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "jasmine_tea_cost",
      label: "Jasmine Tea Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "black_tea_value",
    //   label: "Black Tea Value",
    //   headerStyle: { backgroundColor: "#B7950B" },
    //   cellStyle: { backgroundColor: "#B7950B" },
    // },
    {
      key: "black_tea_wastage",
      label: "Black Tea Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "black_tea_cost",
      label: "Black Tea Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "milk_tea_value",
    //   label: "Milk Tea Value",
    //   headerStyle: { backgroundColor: "#8E44AD" },
    //   cellStyle: { backgroundColor: "#8E44AD" },
    // },
    {
      key: "milk_tea_wastage",
      label: "Milk Tea Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "milk_tea_cost",
      label: "Milk Tea Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "coffee_value",
    //   label: "Coffee Value",
    //   headerStyle: { backgroundColor: "#C0392B" },
    //   cellStyle: { backgroundColor: "#C0392B" },
    // },
    {
      key: "coffee_wastage",
      label: "Coffee Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "coffee_cost",
      label: "Coffee Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "ctc_value",
    //   label: "CTC Value",
    //   headerStyle: { backgroundColor: "MediumSeaGreen" },
    //   cellStyle: { backgroundColor: "MediumSeaGreen" },
    // },
    {
      key: "ctc_wastage",
      label: "CTC Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "ctc_cost",
      label: "CTC Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "yellow_peach_jelly_value",
    //   label: "Yellow Peach Jelly Value",
    //   headerStyle: { backgroundColor: "DodgerBlue" },
    //   cellStyle: { backgroundColor: "DodgerBlue" },
    // },
    {
      key: "yellow_peach_jelly_wastage",
      label: "Yellow Peach Jelly Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "yellow_peach_jelly_cost",
      label: "Yellow Peach Jelly Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "brown_sugar_jelly_value",
    //   label: "Brown Sugar Jelly Value",
    //   headerStyle: { backgroundColor: "Orange" },
    //   cellStyle: { backgroundColor: "Orange" },
    // },
    {
      key: "brown_sugar_jelly_wastage",
      label: "Brown Sugar Jelly Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "brown_sugar_jelly_cost",
      label: "Brown Sugar Jelly Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "peal_value",
    //   label: "Peal Value",
    //   headerStyle: { backgroundColor: "SlateBlue" },
    //   cellStyle: { backgroundColor: "SlateBlue" },
    // },
    {
      key: "peal_wastage",
      label: "Peal Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "peal_cost",
      label: "Peal Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "ice_cream_value",
    //   label: "Ice Cream Value",
    //   headerStyle: { backgroundColor: "Violet" },
    //   cellStyle: { backgroundColor: "Violet" },
    // },
    {
      key: "ice_cream_wastage",
      label: "Ice Cream Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "ice_cream_cost",
      label: "Ice Cream Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // {
    //   key: "melon_ice_cream_value",
    //   label: "Melon Ice Cream Value",
    //   headerStyle: { backgroundColor: "Violet" },
    //   cellStyle: { backgroundColor: "Violet" },
    // },
    {
      key: "melon_ice_cream_wastage",
      label: "Melon Ice Cream Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "melon_ice_cream_cost",
      label: "Melon Ice Cream Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "oreo_value", label: "Oreo Value" },
    {
      key: "oreo_wastage",
      label: "Oreo Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "oreo_cost",
      label: "Oreo Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "yellow_peach_jam_value", label: "Yellow Peach Jam Value" },
    {
      key: "yellow_peach_jam_wastage",
      label: "Yellow Peach Jam Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "yellow_peach_jam_cost",
      label: "Yellow Peach Jam Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "pink_peach_jam_value", label: "Pink Peach Jam Value" },
    {
      key: "pink_peach_jam_wastage",
      label: "Pink Peach Jam Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "pink_peach_jam_cost",
      label: "Pink Peach Jam Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "kiwi_jam_value", label: "Kiwi Jam Value" },
    {
      key: "kiwi_jam_wastage",
      label: "Kiwi Jam Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "kiwi_jam_cost",
      label: "Kiwi Jam Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "strawberry_jam_value", label: "Strawberry Jam Value" },
    {
      key: "strawberry_jam_wastage",
      label: "Strawberry Jam Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "strawberry_jam_cost",
      label: "Strawberry Jam Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "mango_jam_value", label: "Mango Jam Value" },
    {
      key: "mango_jam_wastage",
      label: "Mango Jam Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "mango_jam_cost",
      label: "Mango Jam Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "passion_fruit_jam_value", label: "Passion Fruit Jam Value" },
    {
      key: "passion_fruit_jam_wastage",
      label: "Passion Fruit Jam Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "passion_fruit_jam_cost",
      label: "Passion Fruit Jam Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "nata_de_coco_value", label: "Nata De Coco Value" },
    {
      key: "nata_de_coco_wastage",
      label: "Nata De Coco Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "nata_de_coco_cost",
      label: "Nata De Coco Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
    // { key: "lemon_value", label: "Lemon Value" },
    {
      key: "lemon_wastage",
      label: "Lemon Wastage",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "lemon_cost",
      label: "Lemon Cost",
      classHead: "bg-secondary text-light",
      classBody: "bg-secondary text-light text-end",
    },
  ];

  // Specify which columns you want to include in the filter
  const filterableColumns = [
    // { key: 'day', label: 'Day' },
    { key: "month_date", label: "Month Date" },
    // { key: 'year', label: 'Year' }
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
                        <option value="0">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                      <label htmlFor="monthSelect">Month</label>
                    </div>
                  </div>
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
          <div className="table-responsive shadow rounded-3">
            <table className="table table-striped table-hover table-bordered mb-0">
              <thead>
                <tr>
                  {columns.map((column, index) => {
                    const prevColumn = columns[index - 1];

                    if (column.key === "month_date") {
                      return (
                        <th
                          key={column.key}
                          className={`${column.classHead}`}
                          style={{}}
                        >
                          {column.label}
                        </th>
                      );
                    } else {
                      return (
                        <th
                          key={column.key}
                          className={`${column.classHead}`}
                          style={{}}
                        >
                          {column.label}
                        </th>
                      );
                    }
                  })}
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
                              style={{}}
                              className={`${column.classBody}`}
                            >
                              {record[column.key]}
                            </td>
                          );
                        } else if (column.key === "day") {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={{}}
                              className={`${column.classBody}`}
                            >
                              {days[record[column.key]]}
                            </td>
                          );
                        } else if (
                          column.key === "variance" ||
                          column.key === "month_date_sales" ||
                          column.key === "sales_walk_in"
                        ) {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={{}}
                              className={`${column.classBody}`}
                            >
                              {parseFloat(record[column.key])
                                .toFixed(2)
                                .toString()}
                            </td>
                          );
                        } else {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={{}}
                              className={`${column.classBody}`}
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

              {/* Display page numbers with ellipsis for large sets */}
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;

                // Show first page, last page, current page, and pages around current
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
                }
                // Show ellipsis
                else if (
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

export default TableWastage;
