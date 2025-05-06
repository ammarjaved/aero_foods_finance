// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import TimeTable from "./timetable";

function TimeFormComponent() {
  const [formData, setFormData] = useState({
    name: "", // This could be employee name or shift identifier
    start_time: "", // Current time as start time
    end_time: "", // Current time as end time (to be updated later)
    is_break: "no",
    break_time: 0,
    total_hr: 0,
  });

  const [imagePreviews, setImagePreviews] = useState({
    image_pos: "",
    image_recipt: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const [sortFilters, setSortFilters] = useState(undefined);
  const [isFetch, setIsFetch] = useState(false);

  const handleFilter = (props) => {
    try {
      setSortFilters(props);
    } catch (e) {
      console.error(e);
    }
  };

  const calculateTotalHours = () => {
    const { start_time, end_time, break_time } = formData;

    if (start_time && end_time) {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        // Calculate difference in hours
        const diffMs = endDate - startDate;
        const diffHrs = diffMs / (1000 * 60 * 60);

        // Subtract break time if present
        const breakTimeHrs = parseFloat(break_time) || 0;
        const totalHrs = Math.max(0, diffHrs - breakTimeHrs).toFixed(2);

        setFormData((prev) => ({
          ...prev,
          total_hr: totalHrs,
        }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // Only process non-file inputs here
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    if (["start_time", "end_time", "break_time"].includes(name)) {
      calculateTotalHours();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Create a FormData object for handling file uploads
      const submitData = new FormData();

      // Append all form fields to the FormData
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });

      // Make the API call with FormData
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/log_sheet.php",
        {
          method: "POST",
          body: submitData, // No need to set Content-Type header; browser will set it properly with boundary
        }
      );

      const result = await response.json();

      if (response.ok) {
        // alert(result.message);

        // Create a complete record with the returned ID
        const updatedRecord = {
          ...formData,
          id: result.id,
        };

        // Dispatch appropriate event based on operation type
        if (isEditing) {
          window.dispatchEvent(
            new CustomEvent("recordUpdated", {
              detail: updatedRecord,
            })
          );
        } else {
          window.dispatchEvent(
            new CustomEvent("newRecordAdded", {
              detail: updatedRecord,
            })
          );
        }

        resetForm();
        setIsFormOpen(false);
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to save data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data. Please try again.");
    }
  };

  // Clean up object URLs when component unmounts or when previews change
  useEffect(() => {
    return () => {
      // Revoke any object URLs to avoid memory leaks
      Object.values(imagePreviews).forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [imagePreviews]);

  const resetForm = () => {
    // Reset form data
    setFormData({
      name: "", // This could be employee name or shift identifier
      start_time: "", // Current time as start time
      end_time: "", // Current time as end time (to be updated later)
      is_break: "no",
      break_time: 0,
      total_hr: 0,
    });

    setMapKey(Date.now());
    setIsEditing(false);
  };

  const openNewForm = async () => {
    //  resetForm();
    //  setIsFormOpen(true);
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
      window.location.reload();
    }
  };

  const handleRowClick = (record) => {
    // First completely reset the form to clear any previous values
    resetForm();

    // Create a new object with all form fields explicitly set
    const updatedRecord = {
      ...formData, // Start with the default empty values
      ...record, // Override with record values
    };

    setFormData(updatedRecord);

    setMapKey(Date.now());
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const deleteRecord = async () => {
    if (!window.confirm(`Are you sure you want to delete`)) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/del1.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: formData.id }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Remove the deleted target from the list
        alert("Target deleted successfully");
        resetForm();
        setIsFormOpen(false);
        window.location.reload();
      } else {
        alert(result.error || "Failed to delete target");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  // Function to handle removing an image
  const handleRemoveImage = (fieldName) => {
    // Revoke the object URL if it exists
    if (imagePreviews[fieldName]) {
      URL.revokeObjectURL(imagePreviews[fieldName]);
    }

    // Clear the image preview
    setImagePreviews((prev) => ({
      ...prev,
      [fieldName]: "",
    }));

    // Clear the file from formData
    setFormData((prev) => ({
      ...prev,
      [fieldName]: "",
    }));
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div
              style={{ backgroundColor: "#e80000" }}
              className="card-header text-white d-flex justify-content-between align-items-center"
            >
              <h2 className="mb-0">Time Sheet</h2>
              {false && (
                <button className="btn btn-light" onClick={openNewForm}>
                  Add New Record
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            <TimeTable
              onRowClick={handleRowClick}
              onFilter={(props) => handleFilter(props)}
              sortFilter={sortFilters}
            />
          </div>
        </div>
      </div>

      {/* Sliding Form */}
      <div
        className="position-fixed top-0 end-0 h-100 bg-white shadow-lg"
        style={{
          width: "800px",
          transform: isFormOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
          zIndex: 1050,
          overflowY: "auto",
        }}
      >
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>{isEditing ? "Edit Record" : "New Record"}</h3>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={closeForm}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* <div className="col-md-6">
              <div className="form-group mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
            </div> */}

              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label className="form-label">Name</label>
                  <select
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-control"
                    required
                  >
                    <option value="Janna">Janna</option>
                    <option value="Lia">Lia</option>
                    <option value="Khai">Khai</option>
                    <option value="Danial">Danial</option>
                    <option value="Remi">Remi</option>
                    <option value="Ahmad">Ahmad</option>
                    <option value="Iman">Iman</option>
                    <option value="Zikri">Zikri</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label className="form-label">Start Time</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label className="form-label">End Time</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label className="form-label">Is Break?</label>
                  <select
                    name="is_break"
                    value={formData.is_break}
                    onChange={handleChange}
                    className="form-control"
                    required
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label className="form-label">Break Time (hours)</label>
                  <input
                    type="number"
                    name="break_time"
                    value={formData.break_time}
                    onChange={handleChange}
                    className="form-control"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group mb-3">
                  <label className="form-label">Total Hours</label>
                  <input
                    type="number"
                    name="total_hr"
                    value={formData.total_hr}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteRecord}
              >
                Delete
              </button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Overlay when form is open */}
      {isFormOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark"
          style={{ opacity: 0.5, zIndex: 1040 }}
          onClick={closeForm}
          onFetch={isFetch}
        ></div>
      )}
    </div>
  );
}

export default TimeFormComponent;
