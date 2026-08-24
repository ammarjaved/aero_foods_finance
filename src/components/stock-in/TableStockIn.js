import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function TableStockIn() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(31);
  const [filterValues, setFilterValues] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Edit functionality states
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    stock_in: "",
    month_date: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const date = new Date();
  const monthIndex = date.getMonth();
  const monthNumber = monthIndex + 1;
  const [selectedMonth, setSelectedMonth] = useState(monthNumber);

  // Group data by date and sum prices
  const groupDataByDate = (dataArray) => {
    const grouped = dataArray.reduce((acc, item) => {
      const dateKey = item.month_date;
      if (!acc[dateKey]) {
        acc[dateKey] = {
          month_date: dateKey,
          total_price: 0,
          items: [],
        };
      }
      acc[dateKey].total_price += parseFloat(item.total_value || 0);
      acc[dateKey].items.push(item);
      return acc;
    }, {});

    return Object.values(grouped).sort(
      (a, b) => new Date(b.month_date) - new Date(a.month_date)
    );
  };

  const handleMonthChange = (e) => {
    const monthValue = e.target.value;
    localStorage.setItem("month", monthValue);
    setSelectedMonth(monthValue);
    fetchData(monthValue);
  };

  const handleCategoryChange = (e) => {
    const categoryValue = e.target.value;
    localStorage.setItem("category", categoryValue);
    setCategory(categoryValue);

    const filteredItems = data.filter(
      (item) => item.category === categoryValue
    );

    setFilteredData(filteredItems);
  };

  // Handle row click to show details
  const handleRowClick = (dateGroup) => {
    console.log(dateGroup);
    setSelectedDateDetails(dateGroup);
    setIsDetailPanelOpen(true);
    setEditingItem(null); // Reset editing state
    setDeleteConfirm(null); // Reset delete confirmation
  };

  const closeDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setEditingItem(null);
    setDeleteConfirm(null);
    setTimeout(() => setSelectedDateDetails(null), 300); // Wait for animation
  };

  // Edit functionality
  const handleEditClick = (item, e) => {
    console.log(item);
    e.stopPropagation();
    setEditingItem(item.name);
    setEditForm({
      name: item.name || "",
      stock_in: item.stock_in || "",
      month_date: item.month_date || "",
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async (itemId) => {
    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/update_stockin_trans.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: itemId,
            stock_in: editForm.stock_in,
            month_date: editForm.month_date,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Update local data
        alert("Data Updated successfully");
        const updatedData = data.map((item) =>
          item.name === itemId ? { ...item, ...editForm } : item
        );
        setData(updatedData);

        // Update filtered data
        const updatedFilteredData = filteredData.map((item) =>
          item.name === itemId ? { ...item, ...editForm } : item
        );
        setFilteredData(updatedFilteredData);

        // Update selected date details
        if (selectedDateDetails) {
          const updatedItems = selectedDateDetails.items.map((item) =>
            item.name === itemId ? { ...item, ...editForm } : item
          );
          const newTotal = updatedItems.reduce(
            (sum, item) => sum + parseFloat(item.total_value || 0),
            0
          );
          setSelectedDateDetails({
            ...selectedDateDetails,
            items: updatedItems,
            total_price: newTotal,
          });
        }

        setEditingItem(null);
        fetchData(localStorage.getItem("month"));
        // Dispatch update event
        window.dispatchEvent(
          new CustomEvent("recordUpdated", {
            detail: { name: itemId, ...editForm },
          })
        );
      } else {
        alert("Error updating record: " + result.message);
      }
    } catch (error) {
      console.error("Error updating record:", error);
      alert("Error updating record");
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({ name: "", stock_in: "", total_value: "" });
  };

  // Delete functionality
  const handleDeleteClick = (item, e) => {
    e.stopPropagation();
    setDeleteConfirm(item.name);
  };

  const handleConfirmDelete = async (itemId, month_date) => {
    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/del_stock.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: itemId, date: month_date }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Remove from local data
        alert("Record deleted Successfully");
        const updatedData = data.filter((item) => item.name !== itemId);
        setData(updatedData);

        // Remove from filtered data
        const updatedFilteredData = filteredData.filter(
          (item) => item.name !== itemId
        );
        setFilteredData(updatedFilteredData);

        // Update selected date details
        if (selectedDateDetails) {
          const updatedItems = selectedDateDetails.items.filter(
            (item) => item.name !== itemId
          );
          const newTotal = updatedItems.reduce(
            (sum, item) => sum + parseFloat(item.total_value || 0),
            0
          );
          setSelectedDateDetails({
            ...selectedDateDetails,
            items: updatedItems,
            total_price: newTotal,
          });
        }

        setDeleteConfirm(null);

        // Dispatch delete event
        window.dispatchEvent(
          new CustomEvent("recordDeleted", {
            detail: { name: itemId },
          })
        );
      } else {
        alert("Error deleting record: " + result.message);
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Error deleting record");
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleDeleteAll = async () => {
    if (!selectedDateDetails || selectedDateDetails.items.length === 0) return;
    if (
      !window.confirm(
        `Delete ALL ${selectedDateDetails.items.length} stock-in item(s) for ${selectedDateDetails.month_date}?`
      )
    ) {
      return;
    }
    try {
      const date = selectedDateDetails.month_date;
      await Promise.all(
        selectedDateDetails.items.map((it) =>
          fetch("http://121.121.232.54:88/aero-foods/del_stock.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: it.name, date }),
          })
        )
      );
      alert("All records for this date were deleted.");
      closeDetailPanel();
      const m = localStorage.getItem("month") || selectedMonth;
      fetchData(m);
      window.dispatchEvent(new CustomEvent("recordDeleted", { detail: { date } }));
    } catch (error) {
      console.error("Error deleting all records:", error);
      alert("Error deleting all records.");
    }
  };

  useEffect(() => {
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

  useEffect(() => {
    applyFilters();
  }, [data, filterValues]);

  // Update grouped data when filtered data changes
  useEffect(() => {
    const grouped = groupDataByDate(filteredData);
    setGroupedData(grouped);
  }, [filteredData]);

  const fetchData = (month) => {
    setLoading(true);
    // Fetch data from PHP backend
    fetch(
      "http://121.121.232.54:88/aero-foods/fetch_stockin.php?month=" + month
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

  const handleNewRecord = () => {
    // Reload from the server so aggregated stock-in totals stay correct.
    const m = localStorage.getItem("month") || selectedMonth;
    fetchData(m);
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
      label: "Date",
      classHead: "bg-dark text-light",
      classBody: "bg-dark text-light",
    },
    {
      key: "total_price",
      label: "Total Purchase",
      classHead: "bg-danger text-light",
      classBody: "bg-danger text-light",
    },
  ];

  const filterableColumns = [{ key: "month_date", label: "Month Date" }];

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = groupedData.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(groupedData.length / recordsPerPage);

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
                </div>
              </div>
            )}
          </div>

          {/* Pagination controls - top */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              Showing {indexOfFirstRecord + 1} to{" "}
              {Math.min(indexOfLastRecord, groupedData.length)} of{" "}
              {groupedData.length} records
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
            <div
              className={`col-12 ${
                isDetailPanelOpen ? "col-lg-8" : ""
              } transition-all`}
            >
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
                      <>
                        {currentRecords.map((record, index) => (
                          <tr
                            key={`${record.month_date}-${index}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => handleRowClick(record)}
                            className="hover-row"
                          >
                            <td className={columns[0].classBody}>
                              {record.month_date}
                            </td>
                            <td className={columns[1].classBody}>
                              RM{record.total_price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="table-dark fw-bold">
                          <td className="text-end">Total:</td>
                          <td>
                            RM{currentRecords.reduce((sum, record) => sum + record.total_price, 0).toFixed(2)}
                          </td>
                        </tr>
                      </>
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

            {/* Detail Panel */}
            <div className={`col-lg-4 ${isDetailPanelOpen ? "" : "d-none"}`}>
              <div
                className={`detail-panel ${
                  isDetailPanelOpen ? "slide-in" : "slide-out"
                }`}
                style={{
                  position: "fixed",
                  right: isDetailPanelOpen ? "0" : "-400px",
                  top: "0",
                  width: "400px",
                  height: "100vh",
                  backgroundColor: "white",
                  boxShadow: "-2px 0 10px rgba(0,0,0,0.1)",
                  zIndex: 1050,
                  transition: "right 0.3s ease-in-out",
                  overflowY: "auto",
                }}
              >
                <div className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">
                      Details for {selectedDateDetails?.month_date}
                    </h5>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleDeleteAll}
                      >
                        🗑️ Delete All
                      </button>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={closeDetailPanel}
                        aria-label="Close"
                      ></button>
                    </div>
                  </div>

                  {selectedDateDetails && (
                    <>
                      <div className="mb-3">
                        <div className="card">
                          <div className="card-body">
                            <h6 className="card-title">Summary</h6>
                            <p className="card-text">
                              <strong>Date:</strong>{" "}
                              {selectedDateDetails.month_date}
                              <br />
                              <strong>Total Items:</strong>{" "}
                              {selectedDateDetails.items.length}
                              <br />
                              <strong>Total Value:</strong> RM
                              {selectedDateDetails.total_price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table className="table table-sm table-striped">
                          <thead>
                            <tr>
                              <th className="bg-success text-light">
                                Item Name
                              </th>
                              <th className="bg-success text-light">
                                Stock In
                              </th>
                              <th className="bg-primary text-light">
                                Price (RM)
                              </th>
                              <th className="bg-warning text-dark">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDateDetails.items.map((item, index) => (
                              <tr key={`detail-${item.name}-${index}`}>
                                <td className="bg-success text-light">
                                  {editingItem === item.name ? (
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={editForm.name}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    item.name
                                  )}
                                </td>
                                <td className="bg-success text-light">
                                  {editingItem === item.name ? (
                                    <input
                                      type="number"
                                      className="form-control form-control-sm"
                                      value={editForm.stock_in}
                                      onChange={(e) =>
                                        handleEditFormChange(
                                          "stock_in",
                                          e.target.value
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    item.stock_in
                                  )}
                                </td>
                                <td className="bg-primary text-light text-end">
                                  {parseFloat(item.total_value || 0).toFixed(2)}
                                </td>
                                <td className="bg-warning text-dark">
                                  {editingItem === item.name ? (
                                    <div
                                      className="btn-group-vertical btn-group-sm"
                                      role="group"
                                    >
                                      <button
                                        type="button"
                                        className="btn btn-success btn-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSaveEdit(item.name);
                                        }}
                                        title="Save"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelEdit();
                                        }}
                                        title="Cancel"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : deleteConfirm === item.name ? (
                                    <div
                                      className="btn-group-vertical btn-group-sm"
                                      role="group"
                                    >
                                      <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirmDelete(
                                            item.name,
                                            item.month_date
                                          );
                                        }}
                                        title="Confirm Delete"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelDelete();
                                        }}
                                        title="Cancel Delete"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      className="btn-group-vertical btn-group-sm"
                                      role="group"
                                    >
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={(e) =>
                                          handleEditClick(item, e)
                                        }
                                        title="Edit"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={(e) =>
                                          handleDeleteClick(item, e)
                                        }
                                        title="Delete"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                            <tr className="table-dark fw-bold">
                              <td colSpan="2" className="text-end">Total:</td>
                              <td className="text-end">
                                {selectedDateDetails.items.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0).toFixed(2)}
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
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
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.3)",
                zIndex: 1040,
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
        .btn-group-vertical .btn {
          margin-bottom: 2px;
        }
        .btn-group-vertical .btn:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}

export default TableStockIn;
