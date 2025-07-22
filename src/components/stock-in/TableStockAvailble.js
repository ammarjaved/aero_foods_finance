import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function TableStockAvailable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(31);
  const [filterValues, setFilterValues] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  
  const date = new Date();
  const monthIndex = date.getMonth();
  const monthNumber = monthIndex + 1;
  const [selectedMonth, setSelectedMonth] = useState(monthNumber);

  const handleMonthChange = (e) => {
    const monthValue = e.target.value;
    setSelectedMonth(monthValue);
    fetchData(monthValue);
  };

  const handleCategoryChange = (e) => {
    const categoryValue = e.target.value;
    setCategory(categoryValue);

    if (categoryValue === "") {
      setFilteredData(data);
    } else {
      const filteredItems = data.filter(
        (item) => item.category === categoryValue
      );
      setFilteredData(filteredItems);
    }
  };

  // Handle row click to show product details
  const handleRowClick = (product) => {
    setSelectedProductDetails(product);
    setIsDetailPanelOpen(true);
  };

  const closeDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setTimeout(() => setSelectedProductDetails(null), 300); // Wait for animation
  };

  useEffect(() => {
    const monthvalue = selectedMonth;
    fetchData(monthvalue);

    window.addEventListener("newRecordAdded", handleNewRecord);
    window.addEventListener("recordUpdated", handleRecordUpdate);

    return () => {
      window.removeEventListener("newRecordAdded", handleNewRecord);
      window.removeEventListener("recordUpdated", handleRecordUpdate);
    };
  }, []);

  useEffect(() => {
    applyFilters();
    // Extract unique categories from data
    const uniqueCategories = [...new Set(data.map(item => item.category))];
    setCategories(uniqueCategories);
  }, [data, filterValues]);

  const fetchData = (month) => {
    setLoading(true);
    // Fetch data from PHP backend
    fetch("http://121.121.232.54:88/aero-foods/stock_avail.php")
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
    setCategory("");
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      classHead: "bg-dark text-light",
      classBody: "bg-dark text-light",
    },
    {
      key: "remaining_boxes",
      label: "Remaining Boxes",
      classHead: "bg-dark text-light",
      classBody: "bg-dark text-light",
    },
    {
      key: "remaining_loose_packets",
      label: "Remaining Loose Packets",
      classHead: "bg-success text-light",
      classBody: "bg-success text-light text-end",
    },
    {
      key: "remaining_percentage",
      label: "Remaining Percentage",
      classHead: "bg-success text-light",
      classBody: "bg-success text-light text-end",
    }
  ];

  const filterableColumns = [
    { key: "name", label: "Product Name" },
    { key: "code", label: "Product Code" },
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
  ) || category !== "";

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
          {/* Filter Panel Toggle */}
          <div className="mb-2">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={toggleFilterPanel}
            >
              {isFilterPanelOpen ? "Hide Filters" : "Show Filters"}
            </button>
          </div>

          {/* Filter Panel */}
          <div className={`card mb-3 ${isFilterPanelOpen ? "" : "d-none"}`}>
            <div className="card-header">
              <h6 className="mb-0">Filters</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={handleCategoryChange}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                {filterableColumns.map((column) => (
                  <div key={column.key} className="col-md-3">
                    <label className="form-label">{column.label}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Filter by ${column.label}`}
                      value={filterValues[column.key] || ""}
                      onChange={(e) =>
                        handleFilterChange(column.key, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
              {hasActiveFilters && (
                <div className="mt-2">
                  <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
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
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={31}>31</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Main content area */}
          <div className="row">
            <div className={`col-12 ${isDetailPanelOpen ? 'col-lg-8' : ''} transition-all`}>
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
                          key={`${record.code || record.id}-${index}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleRowClick(record)}
                          className="hover-row"
                        >
                          <td className={columns[0].classBody}>
                            {record.name}
                          </td>
                          <td className={columns[1].classBody}>
                            {record.remaining_boxes}
                          </td>
                          <td className={columns[2].classBody}>
                            {record.remaining_loose_packets}
                          </td>
                          <td className={columns[3].classBody}>
                            {record.remaining_percentage}%
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
                  </tbody>
                </table>
              </div>

              {/* Pagination controls - bottom */}
              <nav aria-label="Page navigation" className="mt-3">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
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
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <li
                          key={pageNumber}
                          className={`page-item ${currentPage === pageNumber ? "active" : ""}`}
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
                      (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                    ) {
                      return (
                        <li key={pageNumber} className="page-item disabled">
                          <span className="page-link">...</span>
                        </li>
                      );
                    }
                    return null;
                  })}

                  <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
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

            {/* Detail Panel */}
            <div className={`col-lg-4 ${isDetailPanelOpen ? '' : 'd-none'}`}>
              <div
                className={`detail-panel ${isDetailPanelOpen ? 'slide-in' : 'slide-out'}`}
                style={{
                  position: 'fixed',
                  right: isDetailPanelOpen ? '0' : '-400px',
                  top: '0',
                  width: '400px',
                  height: '100vh',
                  backgroundColor: 'white',
                  boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
                  zIndex: 1050,
                  transition: 'right 0.3s ease-in-out',
                  overflowY: 'auto'
                }}
              >
                <div className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      Product Details
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeDetailPanel}
                      aria-label="Close"
                    ></button>
                  </div>

                  {selectedProductDetails && (
                    <>
                      <div className="mb-3">
                        <div className="card">
                          <div className="card-body">
                            <h6 className="card-title">{selectedProductDetails.name}</h6>
                            <p className="card-text">
                              <strong>Code:</strong> {selectedProductDetails.code}<br/>
                              <strong>Category:</strong> {selectedProductDetails.category}<br/>
                              <strong>Unit Price:</strong> RM{selectedProductDetails.unit_price}<br/>
                              <strong>Unit:</strong> {selectedProductDetails.unit}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="card mb-3">
                        <div className="card-header">
                          <h6 className="mb-0">Stock Information</h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-6">
                              <small className="text-muted">Total Boxes</small>
                              <div className="fw-bold">{selectedProductDetails.total_boxes}</div>
                            </div>
                            <div className="col-6">
                              <small className="text-muted">Total Packets</small>
                              <div className="fw-bold">{selectedProductDetails.total_packets}</div>
                            </div>
                            <div className="col-6 mt-2">
                              <small className="text-muted">Remaining Boxes</small>
                              <div className="fw-bold text-warning">{selectedProductDetails.remaining_boxes}</div>
                            </div>
                            <div className="col-6 mt-2">
                              <small className="text-muted">Remaining Packets</small>
                              <div className="fw-bold text-warning">{selectedProductDetails.remaining_packets}</div>
                            </div>
                            <div className="col-6 mt-2">
                              <small className="text-muted">Loose Packets</small>
                              <div className="fw-bold text-info">{selectedProductDetails.remaining_loose_packets}</div>
                            </div>
                            <div className="col-6 mt-2">
                              <small className="text-muted">Remaining %</small>
                              <div className="fw-bold text-success">{selectedProductDetails.remaining_percentage}%</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedProductDetails.description && (
                        <div className="card">
                          <div className="card-header">
                            <h6 className="mb-0">Description</h6>
                          </div>
                          <div className="card-body">
                            <p className="card-text small">{selectedProductDetails.description}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Overlay */}
          {isDetailPanelOpen && (
            <div
              className="modal-backdrop"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.3)',
                zIndex: 1040
              }}
              onClick={closeDetailPanel}
            ></div>
          )}
        </>
      )}

      <style jsx>{`
        .hover-row:hover {
          background-color: #f8f9fa !important;
        }
        .transition-all {
          transition: all 0.3s ease;
        }
        .slide-in {
          animation: slideIn 0.3s ease-in-out;
        }
        .slide-out {
          animation: slideOut 0.3s ease-in-out;
        }
        @keyframes slideIn {
          from {
            right: -400px;
          }
          to {
            right: 0;
          }
        }
        @keyframes slideOut {
          from {
            right: 0;
          }
          to {
            right: -400px;
          }
        }
      `}</style>
    </div>
  );
}

export default TableStockAvailable;