// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import SalaryTable from "./SalaryTable";

function SalaryFormComponent() {
  const defaultRecord = {
    month: "",
    year: new Date().getFullYear().toString(),
    mixue: "",
    abeyus: "",
    dac: "",
    dac_lyp: "",
    ojim: "",
    sds_hq: "",
  };

  // For multiple records mode
  const [formRecords, setFormRecords] = useState([defaultRecord]);

  // For single record editing mode
  const [editFormData, setEditFormData] = useState(defaultRecord);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  // Add refresh trigger for table
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const handleRecordChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRecords = [...formRecords];
    updatedRecords[index] = {
      ...updatedRecords[index],
      [name]: value,
    };
    setFormRecords(updatedRecords);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value,
    });
  };

  const addNewRecord = () => {
    setFormRecords([...formRecords, { ...defaultRecord }]);
  };

  const removeRecord = (index) => {
    if (formRecords.length > 1) {
      const updatedRecords = formRecords.filter((_, i) => i !== index);
      setFormRecords(updatedRecords);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let submitData = [];

      if (isEditing) {
        // Single record edit
        const editData = {};
        Object.keys(editFormData).forEach((key) => {
          let floatKeys = [
            "mixue",
            "abeyus",
            "dac",
            "dac_lyp",
            "ojim",
            "sds_hq",
          ];
          if (floatKeys.includes(key)) {
            editData[key] = editFormData[key]
              ? parseFloat(editFormData[key]).toFixed(2)
              : null;
          } else {
            editData[key] = editFormData[key];
          }
        });
        editData["created_by"] = localStorage.getItem("user");
        editData["updated_by"] = localStorage.getItem("user");
        submitData = [editData];
      } else {
        // Multiple records submission
        submitData = formRecords.map((record) => {
          const recordData = {};
          Object.keys(record).forEach((key) => {
            let floatKeys = [
              "mixue",
              "abeyus",
              "dac",
              "dac_lyp",
              "ojim",
              "sds_hq",
            ];
            if (floatKeys.includes(key)) {
              recordData[key] = record[key]
                ? parseFloat(record[key]).toFixed(2)
                : null;
            } else {
              recordData[key] = record[key];
            }
          });
          recordData["created_by"] = localStorage.getItem("user");
          recordData["updated_by"] = localStorage.getItem("user");
          return recordData;
        });
      }

      // Make the API call
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/update-salary.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitData),
        },
      );

      const result = await response.json();

      if (response.ok) {
        const recordCount = submitData.length;
        const successMessage = isEditing
          ? "Record updated successfully"
          : `${recordCount} record${
              recordCount > 1 ? "s" : ""
            } added successfully`;

        alert(result.message || successMessage);

        // Method 1: Dispatch custom events (your current approach)
        if (result.results && Array.isArray(result.results)) {
          result.results.forEach((savedRecord, index) => {
            const originalRecord = isEditing
              ? editFormData
              : formRecords[index];
            const updatedRecord = {
              ...originalRecord,
              ...savedRecord, // Merge API response data
            };
            window.location.reload();
            if (isEditing) {
              window.dispatchEvent(
                new CustomEvent("recordUpdated", {
                  detail: updatedRecord,
                }),
              );
            } else {
              window.dispatchEvent(
                new CustomEvent("newRecordAdded", {
                  detail: updatedRecord,
                }),
              );
            }
          });
        } else {
          // Fallback if API response doesn't have results array
          console.warn(
            "API response doesn't have expected structure, triggering table refresh",
          );
          triggerTableRefresh();
        }

        resetForm();
        setIsFormOpen(false);
      } else {
        throw new Error(result.error || "Failed to save data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data. Please try again.");
    }
  };

  // Method 2: Force table refresh using key prop
  const triggerTableRefresh = () => {
    setTableRefreshKey((prev) => prev + 1);
  };

  // Method 3: Dispatch a general refresh event
  const dispatchTableRefresh = () => {
    window.dispatchEvent(new CustomEvent("refreshTable"));
  };

  const resetForm = () => {
    setFormRecords([{ ...defaultRecord }]);
    setEditFormData({ ...defaultRecord });
    setMapKey(Date.now());
    setIsEditing(false);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleRowClick = async (record) => {
    resetForm();
    setEditFormData({ ...defaultRecord, ...record });
    setMapKey(Date.now());
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  // Uncomment and update if you want to add delete functionality
  const deleteRecord = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete the salary record for "${editFormData.month} ${editFormData.year}"?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/delete_salary.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: editFormData.id }),
        },
      );

      const result = await response.json();

      if (response.ok && result.status === "success") {
        alert("Record deleted successfully");

        // Dispatch delete event
        window.dispatchEvent(
          new CustomEvent("recordDeleted", {
            detail: { id: editFormData.id },
          }),
        );

        resetForm();
        setIsFormOpen(false);
      } else {
        alert(result.error || "Failed to delete record");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const isDeleteEnabled = isEditing && editFormData.id;

  // Month options
  const monthOptions = [
    { value: "JAN", label: "January" },
    { value: "FEB", label: "February" },
    { value: "MAC", label: "March" },
    { value: "APR", label: "April" },
    { value: "MAY", label: "May" },
    { value: "JUNE", label: "June" },
    { value: "JULY", label: "July" },
    { value: "AUG", label: "August" },
    { value: "SEP", label: "September" },
    { value: "OCT", label: "October" },
    { value: "NOV", label: "November" },
    { value: "DEC", label: "December" },
  ];

  // Year options (current year and a few years around it)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    yearOptions.push(i.toString());
  }

  const renderRecordForm = (record, index, isEditMode = false) => {
    const handleChange = isEditMode
      ? handleEditChange
      : (e) => handleRecordChange(index, e);
    const formData = isEditMode ? editFormData : record;

    return (
      <div
        key={isEditMode ? `edit-${mapKey}` : `record-${index}`}
        className="border rounded p-3 mb-3"
      >
        {!isEditMode && (
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Record #{index + 1}</h6>
            {formRecords.length > 1 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeRecord(index)}
              >
                Remove
              </button>
            )}
          </div>
        )}

        <div className="row g-2">
          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">Select Month</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Year</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="form-control"
                required
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Mixue Amount</label>
              <input
                type="number"
                name="mixue"
                step="0.01"
                value={formData.mixue}
                onChange={handleChange}
                className="form-control"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Abe-Yus Amount</label>
              <input
                type="number"
                name="abeyus"
                step="0.01"
                value={formData["abeyus"]}
                onChange={handleChange}
                className="form-control"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">DAC Amount</label>
              <input
                type="number"
                name="dac"
                step="0.01"
                value={formData.dac}
                onChange={handleChange}
                className="form-control"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">DAC LYP Amount</label>
              <input
                type="number"
                name="dac_lyp"
                step="0.01"
                value={formData.dac_lyp}
                onChange={handleChange}
                className="form-control"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Ojim Amount</label>
              <input
                type="number"
                name="ojim"
                step="0.01"
                value={formData.ojim}
                onChange={handleChange}
                className="form-control"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">SDS HQ Amount</label>
              <input
                type="number"
                name="sds_hq"
                step="0.01"
                value={formData.sds_hq}
                onChange={handleChange}
                className="form-control"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Display calculated total */}
        <div className="mt-3">
          <div className="alert alert-info">
            <strong>
              Total: RM{" "}
              {(
                (parseFloat(formData.mixue) || 0) +
                (parseFloat(formData["abeyus"]) || 0) +
                (parseFloat(formData.dac) || 0) +
                (parseFloat(formData.dac_lyp) || 0) +
                (parseFloat(formData.ojim) || 0) +
                (parseFloat(formData.sds_hq) || 0)
              ).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card"></div>
          <div className="card-body">
            {/* Pass refresh key to force re-render when needed */}
            <SalaryTable key={tableRefreshKey} onRowClick={handleRowClick} />
          </div>
        </div>
      </div>

      {/* Sliding Form */}
      <div
        className="position-fixed top-0 end-0 h-100 bg-white shadow-lg"
        style={{
          width: "600px",
          transform: isFormOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
          zIndex: 1050,
          overflowY: "auto",
        }}
      >
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>
              {isEditing ? "Edit Salary Record" : "Add New Salary Records"}
            </h3>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={closeForm}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {isEditing ? (
              // Single record edit mode
              renderRecordForm(editFormData, 0, true)
            ) : (
              // Multiple records mode
              <>
                {formRecords.map((record, index) =>
                  renderRecordForm(record, index, false),
                )}

                <div className="text-center mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={addNewRecord}
                  >
                    <i className="fas fa-plus"></i> Add Another Record
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 d-flex justify-content-between">
              {isDeleteEnabled && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deleteRecord}
                >
                  Delete
                </button>
              )}
              <div className="ms-auto">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing
                    ? "Update"
                    : `Save ${formRecords.length} Record${
                        formRecords.length > 1 ? "s" : ""
                      }`}
                </button>
              </div>
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
        ></div>
      )}
    </div>
  );
}

export default SalaryFormComponent;
