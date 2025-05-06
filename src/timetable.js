import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function Timetable({ onRowClick, onFilter, sortFilter, isFetch }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(30);
  const [filteredData, setFilteredData] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [names, setNames] = useState([]);

  const [hours, setHours] = useState({
    ot: 0,
    total_hr: 0,
    isVisible: false,
  });

  const [filters, setFilters] = useState({});

  // Filter states
  const [nameFilter, setNameFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageView = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const handleImageUpload = (e, field) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Store the actual file object in state
      setEditFormData((prev) => ({
        ...prev,
        [field]: file, // Store the file object, not a data URL
      }));
    }
  };

  useEffect(() => {
    try {
      if (filteredData && filteredData.length > 0) {
        setHours({
          ot: filteredData.reduce((n, { ot }) => n + parseFloat(ot), 0),
          total_hr: filteredData.reduce(
            (n, { total_hr }) => n + parseFloat(total_hr),
            0
          ),
          isVisible: true,
        });
      } else {
        setHours({
          ot: 0,
          total_hr: 0,
          isVisible: false,
        });
      }
    } catch (e) {
      console.error(e);
      setHours({
        ot: 0,
        total_hr: 0,
        isVisible: false,
      });
    }
  }, [filteredData]);

  useEffect(() => {
    try {
      onFilter(filters);
    } catch (e) {
      console.error(e);
    }
  }, [filters]);

  useEffect(() => {
    try {
      if (sortFilter && sortFilter.hasOwnProperty("start_time"))
        setStartDateFilter(sortFilter.start_time);
      if (sortFilter && sortFilter.hasOwnProperty("end_time"))
        setEndDateFilter(sortFilter.end_time);
      if (sortFilter && sortFilter.hasOwnProperty("name"))
        setNameFilter(sortFilter.name);
    } catch (e) {
      console.error(e);
    }
  }, [sortFilter]);

  useEffect(() => {
    if (isFetch) {
      fetchData();
    }
  }, [isFetch]);

  useEffect(() => {
    fetchData();

    fetch("http://121.121.232.54:88/aero-foods/fetchNames.php")
      .then((response) => response.json())
      .then((data) => {
        setNames(data); // assuming data is the array of names
      })
      .catch((error) => {
        console.error("Error fetching names:", error);
      });

    window.addEventListener("newRecordAdded", handleNewRecord);
    window.addEventListener("recordUpdated", handleRecordUpdate);

    return () => {
      window.removeEventListener("newRecordAdded", handleNewRecord);
      window.removeEventListener("recordUpdated", handleRecordUpdate);
    };
  }, []);

  // Apply filters whenever filter values or data changes
  useEffect(() => {
    applyFilters();
  }, [nameFilter, startDateFilter, endDateFilter, data]);

  const fetchData = () => {
    setLoading(true);
    fetch("http://121.121.232.54:88/aero-foods/fetchtimesheet.php")
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setFilteredData(fetchedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  };

  const handleNewRecord = (event) => {
    const newRecord = event.detail;
    setData((prev) => [newRecord, ...prev]);
    setFilteredData((prev) => [newRecord, ...prev]);
  };

  const handleRecordUpdate = (event) => {
    const updatedRecord = event.detail;
    setData((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
    setFilteredData((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
  };

  const formatHours = (val) => {
    if (val === null || val === undefined) return "";
    return parseFloat(val).toFixed(2);
  };

  const handleEditClick = (record) => {
    setEditRowId(record.id);
    setEditFormData({ ...record });
  };

  const handleEditChange = (e, key) => {
    const updatedForm = { ...editFormData, [key]: e.target.value };

    if (["start_time", "end_time", "break_time"].includes(key)) {
      const start = new Date(updatedForm.start_time);
      const end = new Date(updatedForm.end_time);
      const breakHours = parseFloat(updatedForm.break_time) || 0;

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end - start;
        const diffHrs = diffMs / (1000 * 60 * 60);
        const totalHr = parseFloat((diffHrs - breakHours).toFixed(2));
        const ot = totalHr > 8 ? parseFloat((totalHr - 8).toFixed(2)) : 0;
        const meal = totalHr >= 8 ? "8" : "";

        updatedForm.total_hr = isNaN(totalHr) ? "" : totalHr;
        updatedForm.ot = isNaN(ot) ? "" : ot;
        updatedForm.meal = meal;
      }
    }

    setEditFormData(updatedForm);
  };

  const handleCancel = () => {
    setEditRowId(null);
    setEditFormData({});
  };

  const handleCreate = async () => {
    const date = new Date();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayday = days[date.getDay()];

    let submitData = { day: todayday, month_date: date };
    const response = await fetch(
      "http://121.121.232.54:88/aero-foods/log_sheet.php",
      {
        method: "POST",
        body: JSON.stringify(submitData), // No need to set Content-Type header; browser will set it properly with boundary
      }
    );

    const result = await response.json();

    if (response.ok) {
      fetchData();
    }
  };

  // const handleSave = (id) => {

  //   fetch('http://121.121.232.54:88/aero-foods/log_sheet.php', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(editFormData),
  //   })
  //     .then(res => res.json())
  //     .then((response) => {
  //       if (response.success) {
  //         const updatedData = data.map(item => (item.id === id ? editFormData : item));
  //         setData(updatedData);
  //         setFilteredData(updatedData);
  //         setEditRowId(null);
  //       } else {
  //         alert(response.error);
  //       }
  //     })
  //     .catch(err => console.error('Update error:', err));
  // };

  const handleSave = (id) => {
    const formData = new FormData();

    for (const key in editFormData) {
      // Handle File objects (images)
      if (
        (key === "image_start_time" || key === "image_end_time") &&
        editFormData[key] instanceof File
      ) {
        formData.append(key, editFormData[key]);
      } else {
        formData.append(key, editFormData[key]);
      }
    }

    fetch("http://121.121.232.54:88/aero-foods/log_sheet.php", {
      method: "POST",
      body: formData, // No need for headers, browser sets multipart/form-data automatically
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          const updatedData = data.map((item) =>
            item.id === id ? { ...item, ...editFormData } : item
          );
          setData(updatedData);
          setFilteredData(updatedData);
          setEditRowId(null);
          //window.location.reload();
          fetchData();
        } else {
          alert(response.error || "Failed to save");
        }
      })
      .catch((err) => {
        console.error("Update error:", err);
        alert("An error occurred while saving.");
      });
  };

  const handleDelete = (id) => {
    if (!window.confirm(`Are you sure you want to delete`)) {
      return;
    }
    fetch("http://121.121.232.54:88/aero-foods/del1.php", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          alert("Record deleted successfully");
          fetchData();
          //window.location.reload();
        } else {
          alert("Update failed");
        }
      })
      .catch((err) => console.error("Update error:", err));
  };

  // Filter function
  const applyFilters = () => {
    let filtered = [...data];

    // Filter by name
    if (nameFilter) {
      filtered = filtered.filter(
        (record) =>
          record.name &&
          record.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    // Filter by date range
    if (startDateFilter && endDateFilter) {
      const startDate = new Date(startDateFilter);
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59); // Include the entire end date

      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.start_time);
        return recordDate >= startDate && recordDate <= endDate;
      });
    } else if (startDateFilter) {
      const startDate = new Date(startDateFilter);
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.start_time);
        return recordDate >= startDate;
      });
    } else if (endDateFilter) {
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59); // Include the entire end date
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.start_time);
        return recordDate <= endDate;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when applying filters
  };

  // Reset filters
  const resetFilters = () => {
    setNameFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
    setFilteredData(data);
    setCurrentPage(1);
  };

  const columns = [
    // { key: 'id', label: 'ID' },
    { key: "name", label: "Name" },
    { key: "start_time", label: "Start Time" },
    { key: "end_time", label: "End Time" },
    { key: "break_time", label: "Break Duration" },
    { key: "total_hr", label: "Total Hours" },
    { key: "ot", label: "Over Time" },
    { key: "image_start_time", label: "Clock-In Image" },
    { key: "image_end_time", label: "Clock-Out Image" },

    // { key: 'meal', label: 'Meal' },
  ];

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);
  const paginate = (n) => setCurrentPage(n);
  const goToPreviousPage = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);

  // Get all unique names for the filter dropdown
  const uniqueNames = Array.from(
    new Set(data.map((record) => record.name))
  ).filter(Boolean);

  return (
    <div className="container-fluid mt-3">
      <div className="row" style={{ margin: 10 }}>
        <div className="col-12 d-flex justify-content-end">
          <button className="btn btn-danger" onClick={handleCreate}>
            Add New Record
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="card mb-3">
        <div className="card-header bg-light">
          <h5 className="card-title mb-0">Filters</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-2">
              <label className="form-label">Name</label>
              <select
                className="form-select"
                value={nameFilter}
                onChange={(e) => {
                  setNameFilter(e.target.value);
                  setFilters({
                    start_time: startDateFilter,
                    end_time: endDateFilter,
                    name: e.target.value,
                  });
                }}
              >
                <option value="">All Names</option>
                {uniqueNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setFilters({
                    start_time: e.target.value,
                    end_time: endDateFilter,
                    name: nameFilter,
                  });
                }}
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setFilters({
                    start_time: startDateFilter,
                    end_time: e.target.value,
                    name: nameFilter,
                  });
                }}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end mb-2">
              <button className="btn btn-secondary me-2" onClick={resetFilters}>
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hours Info */}
      {hours && hours.isVisible && (
        <div className="card mb-3">
          <div className="card-header bg-light">
            <h5 className="card-title mb-0">Hour Details</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3 mb-2">
                <label className="form-label">Total Hour(s)</label>
                <div className="col-md-3 mb-2">
                  <label className="form-label fw-bold text-danger mb-0">
                    {hours.total_hr}
                  </label>
                </div>
              </div>
              <div className="col-md-3 mb-2">
                <label className="form-label">Total Over Time</label>
                <div className="col-md-3 mb-2">
                  <label className="form-label fw-bold text-danger mb-0">
                    {hours.ot}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between mb-2">
            <span>
              Showing {indexOfFirstRecord + 1} to{" "}
              {Math.min(indexOfLastRecord, filteredData.length)} of{" "}
              {filteredData.length} records
            </span>
            <div>
              <label className="me-2">Records per page:</label>
              <select
                value={recordsPerPage}
                className="form-select form-select-sm"
                onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                style={{ width: "auto" }}
              >
                {[30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered">
              <thead className="table-danger">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <tr key={record.id}>
                      {columns.map((col) => (
                        <td key={col.key}>
                          {editRowId === record.id && col.key !== "id" ? (
                            col.key === "name" ? (
                              <select
                                className="form-select form-select-sm"
                                value={editFormData[col.key] || ""}
                                onChange={(e) => handleEditChange(e, col.key)}
                              >
                                {/* <option value="">Select Name</option>
                                <option value="Janna">Janna</option>
                                <option value="Lia">Lia</option>
                                <option value="Khai">Khai</option>
                                <option value="Danial">Danial</option>
                                <option value="Remi">Remi</option>
                                <option value="Ahmad">Ahmad</option>
                                <option value="Iman">Iman</option>
                                <option value="Zikri">Zikri</option> */}
                                <option value="">Select Name</option>

                                {names?.length > 0 &&
                                  names.map((name, index) => (
                                    <option key={index} value={name}>
                                      {name}
                                    </option>
                                  ))}
                              </select>
                            ) : col.key === "start_time" ||
                              col.key === "end_time" ? (
                              <input
                                type="datetime-local"
                                className="form-control form-control-sm"
                                value={
                                  editFormData[col.key]?.slice(0, 16) || ""
                                }
                                onChange={(e) => handleEditChange(e, col.key)}
                              />
                            ) : col.key === "image_start_time" ||
                              col.key === "image_end_time" ? (
                              <div className="d-flex flex-column gap-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="form-control form-control-sm"
                                  onChange={(e) =>
                                    handleImageUpload(e, col.key)
                                  }
                                />
                                {editFormData[col.key] && (
                                  <div className="mt-1">
                                    <img
                                      src={
                                        typeof editFormData[col.key] ===
                                          "string" &&
                                        !editFormData[col.key].startsWith(
                                          "data:"
                                        )
                                          ? `http://121.121.232.54:88/aero-foods/${
                                              editFormData[col.key]
                                            }`
                                          : typeof editFormData[col.key] ===
                                              "string" &&
                                            editFormData[col.key].startsWith(
                                              "data:"
                                            )
                                          ? editFormData[col.key] // It's already a data URL
                                          : URL.createObjectURL(
                                              editFormData[col.key]
                                            ) // It's a File object
                                      }
                                      alt={`${col.key} preview`}
                                      className="img-thumbnail"
                                      style={{ maxHeight: "60px" }}
                                    />
                                  </div>
                                )}
                              </div>
                            ) : col.key === "break_time" ? (
                              <input
                                type="number"
                                step="0.01"
                                className="form-control form-control-sm"
                                value={editFormData[col.key] || ""}
                                onChange={(e) => handleEditChange(e, col.key)}
                              />
                            ) : col.key === "total_hr" ||
                              col.key === "ot" ||
                              col.key === "meal" ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={editFormData[col.key] || 0}
                                readOnly
                              />
                            ) : (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={editFormData[col.key] || ""}
                                onChange={(e) => handleEditChange(e, col.key)}
                              />
                            )
                          ) : col.key === "image_start_time" ||
                            col.key === "image_end_time" ? (
                            <div className="d-flex flex-column align-items-center gap-1">
                              {record[col.key] && record[col.key].length > 5 ? (
                                <>
                                  {/* <button 
                                      className="btn btn-sm btn-primary mb-1"
                                      onClick={() => handleImageView(record[col.key])}
                                    >
                                      View
                                    </button> */}
                                  <img
                                    src={
                                      "http://121.121.232.54:88/aero-foods/" +
                                      record[col.key]
                                    }
                                    alt={`${col.key}`}
                                    className="img-thumbnail"
                                    style={{
                                      maxHeight: "40px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      handleImageView(
                                        "http://121.121.232.54:88/aero-foods/" +
                                          record[col.key]
                                      )
                                    }
                                  />
                                </>
                              ) : (
                                <span className="text-muted">No image</span>
                              )}
                            </div>
                          ) : col.key.includes("hr") ||
                            col.key === "break_time" ||
                            col.key === "ot" ? (
                            formatHours(record[col.key])
                          ) : (
                            record[col.key]
                          )}
                        </td>
                      ))}
                      <td>
                        {editRowId === record.id ? (
                          <>
                            <button
                              className="btn btn-sm btn-success me-1"
                              onClick={() => handleSave(record.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn btn-sm btn-warning me-1"
                              onClick={() => handleEditClick(record)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(record.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <nav>
            <ul className="pagination justify-content-center">
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button className="page-link" onClick={goToPreviousPage}>
                  Previous
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <li
                  key={n}
                  className={`page-item ${n === currentPage ? "active" : ""}`}
                >
                  <button className="page-link" onClick={() => paginate(n)}>
                    {n}
                  </button>
                </li>
              ))}
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
          </nav>
        </>
      )}

      {selectedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={closeModal}
        >
          <img
            src={selectedImage}
            alt="Full View"
            style={{ maxHeight: "90%", maxWidth: "90%" }}
          />
        </div>
      )}
    </div>
  );
}

export default Timetable;
