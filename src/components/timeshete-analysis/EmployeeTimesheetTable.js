import React, { useState, useEffect } from "react";
import TimesheetFormComponent from "./EmployeeFormComponent";
import ScheduleExporter from "./schedule-exporter";
import { canEdit } from "../../roles";

const EmployeeTimesheet = () => {
  const allowEdit = canEdit();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/get_emp_timesheet.php"
      );
      const result = await response.json();

      if (result.status === "success") {
        // Sort by month_date descending by default
        const sortedData = result.results.sort(
          (a, b) => new Date(b.month_date) - new Date(a.month_date)
        );
        setData(sortedData);
      } else {
        setError("Failed to fetch data");
      }
    } catch (err) {
      setError("Error loading timesheet data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === "0000-00-00 00:00:00") return "-";
    const date = new Date(timeString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleRowClick = (item) => {
    setEditData(item);
    setShowModal(true);
  };

  const handleOpenAddModal = () => {
    setEditData(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditData(null);
  };

  const handleSave = () => {
    fetchData(); // Refresh table after save
  };

  const filteredData = dateFilter
    ? data.filter((item) => item.month_date === dateFilter)
    : data;

  const uniqueDates = [...new Set(data.map((item) => item.month_date))]
    .sort()
    .reverse();

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading timesheet data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h2 className="card-title mb-1">
                <i className="bi bi-people-fill text-primary me-2"></i>
                Employee Timesheet
              </h2>
              <p className="text-muted mb-0">
                {allowEdit
                  ? "Aero Foods - Click row to edit"
                  : "Aero Foods - Click row to view"}
              </p>
            </div>
            <div className="col-md-3 text-md-end">
              <small className="text-muted d-block">Total Records</small>
              <h3 className="text-primary mb-0">{filteredData.length}</h3>
            </div>
            <div className="col-md-3 text-md-end">
              {allowEdit && (
                <button className="btn btn-primary" onClick={handleOpenAddModal}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Entry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <i className="bi bi-calendar3 text-muted"></i>
            </div>
            <div className="col-auto">
              <label className="form-label mb-0 fw-semibold">
                Filter by Date:
              </label>
            </div>
            <div className="col-md-3">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-select"
              >
                <option value="">All Dates</option>
                {uniqueDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </div>
            {dateFilter && (
              <div className="col-auto">
                <button
                  onClick={() => setDateFilter("")}
                  className="btn btn-link text-decoration-none"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
        </div>
        <ScheduleExporter
          scheduleData={data} // Array of 7 days with records
          startDate={dateFilter} // Start date string
        />
      </div>

      {/* Table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Employee</th>
                  <th scope="col">Start Time</th>
                  <th scope="col">End Time</th>
                  <th scope="col" className="text-center">
                    Total proposed Hours
                  </th>
                  <th scope="col" className="text-center">
                    Break
                  </th>
                  <th scope="col" className="text-center">
                    Total Actual Hours
                  </th>
                  <th scope="col" className="text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="align-middle">
                      {formatDate(item.month_date)}
                    </td>
                    <td className="align-middle">
                      <div className="d-flex align-items-center">
                        <div
                          className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-2"
                          style={{ width: "35px", height: "35px" }}
                        >
                          <strong>
                            {item.employee_name.charAt(0).toUpperCase()}
                          </strong>
                        </div>
                        <span className="fw-semibold">
                          {item.employee_name}
                        </span>
                      </div>
                    </td>
                    <td className="align-middle">
                      <i className="bi bi-clock text-muted me-2"></i>
                      {formatTime(item.proposed_start_time)}
                    </td>
                    <td className="align-middle">
                      <i className="bi bi-clock text-muted me-2"></i>
                      {formatTime(item.proposed_end_time)}
                    </td>
                    <td className="align-middle text-center">
                      <span
                        className={`badge ${
                          parseInt(item.total_hours) === 0
                            ? "bg-secondary"
                            : parseInt(item.total_hours) >= 10
                            ? "bg-success"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {Number(item.total_hours).toFixed(1)}h
                      </span>
                    </td>
                    <td className="align-middle">
                      <i className="bi bi-clock text-muted me-2"></i>
                      {item.break_hour}h
                    </td>

                    <td className="align-middle text-center">
                      <span
                        className={`badge ${
                          parseInt(item.total_hr) === 0
                            ? "bg-secondary"
                            : parseInt(item.total_hr) >= 10
                            ? "bg-success"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {item.total_hr ? item.total_hr : 0}h
                      </span>
                    </td>
                    <td className="align-middle text-center">
                      <span
                        className={`badge ${
                          item.off_day
                            ? "bg-danger"
                            : parseInt(item.total_hours) === 0
                            ? "bg-secondary"
                            : "bg-success"
                        }`}
                      >
                        {item.off_day
                          ? "Off Day"
                          : parseInt(item.total_hours) === 0
                          ? "No Hours"
                          : "Scheduled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-5">
          <p className="text-muted">No timesheet records found</p>
        </div>
      )}

      {/* Form Modal */}
      <TimesheetFormComponent
        show={showModal}
        onClose={handleCloseModal}
        onSave={handleSave}
        editData={editData}
      />
    </div>
  );
};

export default EmployeeTimesheet;
