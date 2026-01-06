// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import ExpenseTable from "./ExpenseTable";

const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const dayOfWeek = sevenDaysAgo.getDay();
const EXPENSE_TYPES = ["Rental", "Utilities", "Stock", "Logistik", "Claim"];

function ExpenseFormComponent() {
  const defaultRecord = {
    month_date: new Date().toISOString().split("T")[0],
    day: dayOfWeek,
    expense_type_name: "",
    company: "",
    vendor: "",
    amount: "",
    remarks: "",
  };

  // For multiple records mode
  const [formRecords, setFormRecords] = useState([defaultRecord]);

  // For single record editing mode
  const [editFormData, setEditFormData] = useState(defaultRecord);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

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
          let floatKeys = ["amount"];
          if (floatKeys.includes(key)) {
            editData[key] = parseFloat(editFormData[key]).toFixed(2);
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
            let floatKeys = ["amount"];
            if (floatKeys.includes(key)) {
              recordData[key] = parseFloat(record[key]).toFixed(2);
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
        "http://121.121.232.54:88/aero-foods/insert_update_sds_expenditure.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitData),
        }
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

        // Dispatch events for each saved record
        result.results.forEach((savedRecord, index) => {
          const originalRecord = isEditing ? editFormData : formRecords[index];
          const updatedRecord = {
            ...originalRecord,
            id: savedRecord.id,
          };

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
        });

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

  const deleteRecord = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete the expense for "${editFormData.vendor}" with amount ${editFormData.amount}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/delete_sds_expenditure.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: editFormData.id }),
        }
      );

      const result = await response.json();

      if (response.ok && result.status == "success") {
        alert("Record deleted successfully");
        resetForm();
        setIsFormOpen(false);
        window.location.reload();
      } else {
        alert(result.error || "Failed to delete record");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const isDeleteEnabled = isEditing && editFormData.company === "SDS HQ";

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
              <label className="form-label">Month Date</label>
              <input
                type="date"
                name="month_date"
                value={formData.month_date}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div style={{ display: "none" }} className="col-md-6">
            <div className="form-group">
              <label className="form-label">Day</label>
              <input
                type="number"
                name="day"
                value={formData.day}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Expense Type *</label>
            <select
              className="form-select"
              name="expense_type_name"
              value={formData.expense_type_name}
              onChange={handleChange}
              required
            >
              <option value="">Select Expense Type</option>
              {EXPENSE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Company</label>
              <select
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">Select a company</option>
                <option value="Mixue">Mixue</option>
                <option value="Amazon">Amazon</option>
                <option value="Abe Yus">Abe Yus</option>
                <option value="Ojim">Ojim</option>
                <option value="SDS HQ">SDS HQ</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Vendor</label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                name="amount"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>
      </div>
    );
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
              <h2 className="mb-0">SDS HQ</h2>
              <button className="btn btn-light" onClick={openNewForm}>
                Add New Record
              </button>
            </div>
          </div>
          <div className="card-body">
            <ExpenseTable onRowClick={handleRowClick} />
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
            <h3>{isEditing ? "Edit Record" : "Add New Records"}</h3>
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
                  renderRecordForm(record, index, false)
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

export default ExpenseFormComponent;
