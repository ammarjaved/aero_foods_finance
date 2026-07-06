import React, { useEffect, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function UserTable({ onRowClick, onCafeChange }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(31);
  const [cdb, setCdb] = useState("mixue");

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("http://121.121.232.54:88/aero-foods/get_all_user.php?db=" + cdb)
      .then((response) => response.json())
      .then((fetchedData) => {
        const cleanedData = fetchedData.results.map((record) => ({
          id: record.id,
          username: record.username,
          password: record.password,
          is_admin: record.is_admin,
          employment_type: record.employment_type || "",
          basic_salary: record.basic_salary || "",
          created_at: record.created_at,
          updated_at: record.updated_at,
        }));

        // Sort by ID in descending order (newest first)
        const sortedData = cleanedData.sort((a, b) => b.id - a.id);

        setData(sortedData);
        setLoading(false);

        console.log("Sample data:", cleanedData.slice(0, 5));
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [cdb]);

  const setCafe = (val) => {
    setCdb(val);
    if (onCafeChange) {
      onCafeChange(val);
    }
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
          : record,
      ),
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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

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
  ]);

  // Format date for better readability
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Column definitions
  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "Username" },
    { key: "employment_type", label: "Emp. Type" },
    { key: "basic_salary", label: "Basic Salary" },
    { key: "is_admin", label: "Admin" },
    { key: "created_at", label: "Created At" },
  ];

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = data.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(data.length / recordsPerPage);

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

  // Count admin users
  const adminCount = data.filter((user) => user.is_admin === "yes").length;
  const regularCount = data.length - adminCount;

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
          {/* Controls row */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              Showing {indexOfFirstRecord + 1} to{" "}
              {Math.min(indexOfLastRecord, data.length)} of {data.length}{" "}
              records
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

              <div className="d-flex align-items-center">
                <label className="me-2">Select Cafe:</label>
                <select
                  className="form-select form-select-sm"
                  value={cdb}
                  onChange={(e) => {
                    setCafe(e.target.value);
                    // Reset to first page when changing page size
                  }}
                  style={{ width: "auto" }}
                >
                  <option value={"mixue"}>Mixue</option>
                  <option value={"abe"}>Abe-Yus</option>
                  <option value={"amz"}>Amazon</option>
                  <option value={"amz-lyp"}>Amazon-LYP</option>
                  <option value={"ojim"}>Ojim</option>
                  <option value={"mixue-sogo"}>Mixue Sogo</option>
                </select>
              </div>

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
                      onClick={() => onRowClick && onRowClick(record, cdb)}
                      style={{ cursor: onRowClick ? "pointer" : "default" }}
                      className={onRowClick ? "table-row-hover" : ""}
                    >
                      <td>{record.id}</td>
                      <td className="fw-bold">{record.username}</td>
                      <td>
                        {record.employment_type === "Monthly" ? (
                          <span className="badge bg-primary">Monthly</span>
                        ) : record.employment_type === "Hours" ? (
                          <span className="badge bg-info text-dark">Hourly</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {record.employment_type === "Monthly" && record.basic_salary
                          ? `RM ${parseFloat(record.basic_salary).toFixed(2)}`
                          : record.employment_type === "Hours"
                          ? "RM 8.00/hr"
                          : "—"}
                      </td>
                      <td>
                        {record.is_admin === "yes" ? (
                          <span className="badge bg-danger">Admin</span>
                        ) : (
                          <span className="badge bg-secondary">User</span>
                        )}
                      </td>
                      <td>{formatDate(record.created_at)}</td>
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
                      <small>Click "Add New User" to get started</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Card */}
          {data.length > 0 && (
            <div className="card mt-3">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <h6>Total Users: {data.length}</h6>
                  </div>
                  <div className="col-md-4">
                    <h6>
                      <span className="badge bg-danger me-2">Admin</span>
                      {adminCount} users
                    </h6>
                  </div>
                  <div className="col-md-4">
                    <h6>
                      <span className="badge bg-secondary me-2">Regular</span>
                      {regularCount} users
                    </h6>
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

export default UserTable;
