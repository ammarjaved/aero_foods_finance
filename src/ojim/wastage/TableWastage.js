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
  const currentYear = date.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(monthNumber);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate array of years (current year and past 5 years)
  const generateYearOptions = () => {
    const years = [];
    for (let i = 0; i < 10; i++) {
      years.push(currentYear - i);
    }
    return years;
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

  useEffect(() => {
    const monthvalue = localStorage.getItem("month");
    const yearvalue = localStorage.getItem("year");

    if (monthvalue && yearvalue) {
      setSelectedMonth(monthvalue);
      setSelectedYear(yearvalue);
      fetchData(monthvalue, yearvalue);
    } else if (monthvalue) {
      setSelectedMonth(monthvalue);
      fetchData(monthvalue, selectedYear);
    } else if (yearvalue) {
      setSelectedYear(yearvalue);
      fetchData(selectedMonth, yearvalue);
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

  const fetchData = (month, year) => {
    setLoading(true);
    fetch(
      `http://121.121.232.54:88/ojim-cafe/fetch_daily_wastage.php?month=${month}&year=${year}`
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
      key: "final_total",
      label: "Final Total",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "discount",
      label: "Discount",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "bubur_wastage",
      label: "Wastage - Bubur",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "bubur_cost",
      label: "Cost - Bubur",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "ayam_cincang_wastage",
      label: "Wastage - Ayam Cincang",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "ayam_cincang_cost",
      label: "Cost - Ayam Cincang",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "daging_cincang_wastage",
      label: "Wastage - Daging Cincang",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "daging_cincang_cost",
      label: "Cost - Daging Cincang",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "halia_goreng_wastage",
      label: "Wastage - Halia Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "halia_goreng_cost",
      label: "Cost - Halia Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "tempe_goreng_wastage",
      label: "Wastage - Tempe Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "tempe_goreng_cost",
      label: "Cost - Tempe Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "kentang_goreng_wastage",
      label: "Wastage - Kentang Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "kentang_goreng_cost",
      label: "Cost - Kentang Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "ikan_bilis_goreng_wastage",
      label: "Wastage - Ikan Bilis Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "ikan_bilis_goreng_cost",
      label: "Cost - Ikan Bilis Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "peria_goreng_wastage",
      label: "Wastage - Peria Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "peria_goreng_cost",
      label: "Cost - Peria Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "udang_goreng_wastage",
      label: "Wastage - Udang Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "udang_goreng_cost",
      label: "Cost - Udang Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "kacang_goreng_wastage",
      label: "Wastage - Kacang Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "kacang_goreng_cost",
      label: "Cost - Kacang Goreng",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "paru_sira_wastage",
      label: "Wastage - Paru Sira",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "paru_sira_cost",
      label: "Cost - Paru Sira",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "sotong_lobak_manis_wastage",
      label: "Wastage - Sotong Lobak Manis",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "sotong_lobak_manis_cost",
      label: "Cost - Sotong Lobak Manis",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "ikan_masin_lobak_manis_wastage",
      label: "Wastage - Ikan Masin Lobak Manis",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "ikan_masin_lobak_manis_cost",
      label: "Cost - Ikan Masin Lobak Manis",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "telur_masin_wastage",
      label: "Wastage - Telur Masin",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "telur_masin_cost",
      label: "Cost - Telur Masin",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "bawang_goreng_wastage",
      label: "Wastage - Bawang Goreng",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "bawang_goreng_cost",
      label: "Cost - Bawang Goreng",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "daun_bawang_wastage",
      label: "Wastage - Daun Bawang",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "daun_bawang_cost",
      label: "Cost - Daun Bawang",
      classHead: "bg-primary text-light",
      classBody: "bg-primary text-light text-end",
    },
    {
      key: "lada_sulah_wastage",
      label: "Wastage - Lada Sulah",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "lada_sulah_cost",
      label: "Cost - Lada Sulah",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "chilli_flakes_wastage",
      label: "Wastage - Chilli Flakes",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "chilli_flakes_cost",
      label: "Cost - Chilli Flakes",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "sambal_bilis_wastage",
      label: "Wastage - Sambal Bilis",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "sambal_bilis_cost",
      label: "Cost - Sambal Bilis",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "cili_padi_wastage",
      label: "Wastage - Cili Padi",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "cili_padi_cost",
      label: "Cost - Cili Padi",
      classHead: "bg-warning text-light",
      classBody: "bg-warning text-light text-end",
    },
    {
      key: "minyak_bijian_wastage",
      label: "Wastage - Minyak Bijian",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "minyak_bijian_cost",
      label: "Cost - Minyak Bijian",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "kicap_cair_wastage",
      label: "Wastage - Kicap Cair",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
    {
      key: "kicap_cair_cost",
      label: "Cost - Kicap Cair",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light text-end",
    },
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

  return (
    <div className="container-fluid p-3">
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={toggleFilterPanel}
                >
                  {isFilterPanelOpen ? "Hide" : "Show"} Filters{" "}
                  {hasActiveFilters && (
                    <span className="badge bg-primary ms-1">Active</span>
                  )}
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
              <div className="card-body">
                <div className="row g-3">
                  {filterableColumns.map((column) => (
                    <div key={column.key} className="col-md-3">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={`Filter by ${column.label}`}
                        value={filterValues[column.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(column.key, e.target.value)
                        }
                      />
                      <label className="form-label text-muted small mt-1">
                        {column.label}
                      </label>
                    </div>
                  ))}

                  <div className="col-md-3">
                    <select
                      className="form-select form-select-sm"
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
                    <label className="form-label text-muted small mt-1">
                      Month
                    </label>
                  </div>

                  <div className="col-md-3">
                    <select
                      className="form-select form-select-sm"
                      value={selectedYear}
                      onChange={handleYearChange}
                    >
                      <option value="">Select year</option>
                      {generateYearOptions().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <label className="form-label text-muted small mt-1">
                      Year
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              Showing {indexOfFirstRecord + 1} to{" "}
              {Math.min(indexOfLastRecord, filteredData.length)} of{" "}
              {filteredData.length} records
            </div>
            <div className="d-flex align-items-center gap-2">
              <label className="mb-0">Records per page:</label>
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
            <table className="table table-sm table-bordered table-hover">
              <thead className="sticky-top">
                <tr>
                  {columns.map((column, index) => {
                    const prevColumn = columns[index - 1];
                    if (column.key === "month_date") {
                      return (
                        <th
                          key={column.key}
                          className={`${column.classHead} text-center sticky-column`}
                          style={{
                            position: "sticky",
                            left: 0,
                            zIndex: 10,
                          }}
                        >
                          {column.label}
                        </th>
                      );
                    } else {
                      return (
                        <th
                          key={column.key}
                          className={`${column.classHead} text-center`}
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
                              key={column.key}
                              className={`${column.classBody} sticky-column`}
                              style={{
                                position: "sticky",
                                left: 0,
                                zIndex: 5,
                              }}
                            >
                              {record[column.key]}
                            </td>
                          );
                        } else if (column.key === "day") {
                          return (
                            <td key={column.key} className={column.classBody}>
                              {days[record[column.key]]}
                            </td>
                          );
                        } else if (
                          column.key === "variance" ||
                          column.key === "month_date_sales" ||
                          column.key === "sales_walk_in"
                        ) {
                          return (
                            <td key={column.key} className={column.classBody}>
                              {parseFloat(record[column.key])
                                .toFixed(2)
                                .toString()}
                            </td>
                          );
                        } else {
                          return (
                            <td key={column.key} className={column.classBody}>
                              {record[column.key]}
                            </td>
                          );
                        }
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-center mt-3">
            <ul className="pagination pagination-sm">
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button className="page-link" onClick={goToPreviousPage}>
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
                      key={index}
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
                    <li key={index} className="page-item disabled">
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
                <button className="page-link" onClick={goToNextPage}>
                  Next
                </button>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default TableWastage;
