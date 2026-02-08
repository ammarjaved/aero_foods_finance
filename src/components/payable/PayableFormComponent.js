// src/PayableForm.js
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import PayableTable from "./PayableTable";

function PayableForm() {
  // Initial default record
  const [defaultRecord] = useState(() => ({
    company: "",
    payment_to: "",
    payment_details: "",
    due_amount: "",
    payment_due_date: "",
    payment_type: "",
    payment_status: "Pending",
  }));

  // For multiple records mode
  const [formRecords, setFormRecords] = useState([{ ...defaultRecord }]);
  // For single record editing mode
  const [editFormData, setEditFormData] = useState({ ...defaultRecord });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const PAYMENT_TYPES = ["Loan", "Payment", "Advance"];

  const PAYMENT_STATUSES = ["Pending", "Done"];

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
    const newRecord = {
      company: "",
      payment_to: "",
      payment_details: "",
      due_amount: "",
      payment_due_date: "",
      payment_type: "",
      payment_status: "Pending",
    };
    setFormRecords([...formRecords, newRecord]);
  };

  const removeRecord = (index) => {
    if (formRecords.length > 1) {
      const updatedRecords = formRecords.filter((_, i) => i !== index);
      setFormRecords(updatedRecords);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (isEditing) {
      if (!editFormData.company || editFormData.company.trim() === "") {
        alert("Please enter Company name");
        return;
      }
      if (!editFormData.payment_to || editFormData.payment_to.trim() === "") {
        alert("Please enter Payment To");
        return;
      }
      if (
        !editFormData.due_amount ||
        parseFloat(editFormData.due_amount) <= 0
      ) {
        alert("Please enter a valid Due Amount");
        return;
      }
    } else {
      for (let i = 0; i < formRecords.length; i++) {
        const record = formRecords[i];
        if (!record.company || record.company.trim() === "") {
          alert(`Please enter Company name for Record #${i + 1}`);
          return;
        }
        if (!record.payment_to || record.payment_to.trim() === "") {
          alert(`Please enter Payment To for Record #${i + 1}`);
          return;
        }
        if (!record.due_amount || parseFloat(record.due_amount) <= 0) {
          alert(`Please enter a valid Due Amount for Record #${i + 1}`);
          return;
        }
      }
    }

    try {
      let submitData = [];

      if (isEditing) {
        // Single record edit
        const editData = { ...editFormData };
        editData.due_amount = parseFloat(editData.due_amount).toFixed(2);
        submitData = [editData];
      } else {
        // Multiple records submission
        submitData = formRecords.map((record) => {
          const recordData = { ...record };
          recordData.due_amount = parseFloat(record.due_amount).toFixed(2);
          return recordData;
        });
      }

      // Make the API call - Replace with your actual API endpoint
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/payable.php",
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
          ? "Payment record updated successfully"
          : `${recordCount} payment record${
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
    const freshRecord = {
      company: "",
      payment_to: "",
      payment_details: "",
      due_amount: "",
      payment_due_date: "",
      payment_type: "",
      payment_status: "Pending",
    };
    setFormRecords([freshRecord]);
    setEditFormData(freshRecord);
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
        `Are you sure you want to delete the payment to "${editFormData.payment_to}" with amount ${editFormData.due_amount}?`,
      )
    ) {
      return;
    }

    try {
      // Replace with your actual delete API endpoint
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/payable.php",
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

  const renderRecordForm = (record, index, isEditMode = false) => {
    const handleChange = isEditMode
      ? handleEditChange
      : (e) => handleRecordChange(index, e);
    const formData = isEditMode ? editFormData : record;

    return (
      <div key={index} className="mb-4">
        <div className="card">
          <div className="card-body">
            <div className="mb-3">
              {!isEditMode && (
                <div className="d-flex justify-content-between align-items-center mb-3">
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

              <div className="mb-3">
                <label className="form-label">Company *</label>
                <select
                  className="form-select"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
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

              <div className="mb-3">
                <label className="form-label">Payment To *</label>
                <input
                  type="text"
                  className="form-control"
                  name="payment_to"
                  value={formData.payment_to}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Payment Details</label>
                <textarea
                  className="form-control"
                  name="payment_details"
                  value={formData.payment_details}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Due Amount *</label>
                <input
                  type="number"
                  className="form-control"
                  name="due_amount"
                  value={formData.due_amount}
                  onChange={handleChange}
                  step="0.01"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Payment Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="payment_due_date"
                  value={formData.payment_due_date}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Payment Type</label>
                <select
                  className="form-select"
                  name="payment_type"
                  value={formData.payment_type}
                  onChange={handleChange}
                >
                  <option value="">Select Payment Type</option>
                  {PAYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Payment Status</label>
                <select
                  className="form-select"
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleChange}
                >
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Payment Records</h2>
        <button className="btn btn-primary" onClick={openNewForm}>
          + Add New Payment
        </button>
      </div>

      {/* Sliding Form */}
      <div
        className={`position-fixed top-0 end-0 h-100 bg-white shadow-lg transition-transform ${
          isFormOpen ? "translate-x-0" : "translate-x-100"
        }`}
        style={{
          width: "450px",
          transform: isFormOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
          zIndex: 1050,
          overflowY: "auto",
        }}
      >
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0">
              {isEditing ? "Edit Payment Record" : "Add New Payment Records"}
            </h4>
            <button
              type="button"
              className="btn-close"
              onClick={closeForm}
              aria-label="Close"
            ></button>
          </div>

          {isEditing ? (
            renderRecordForm(editFormData, 0, true)
          ) : (
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
                  + Add Another Record
                </button>
              </div>
            </>
          )}

          <div className="d-flex gap-2 pt-3 border-top">
            {isEditing && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteRecord}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary ms-auto"
              onClick={closeForm}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
            >
              {isEditing
                ? "Update"
                : `Save ${formRecords.length} Record${
                    formRecords.length > 1 ? "s" : ""
                  }`}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay when form is open */}
      {isFormOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={closeForm}
        ></div>
      )}

      <PayableTable onRowClick={handleRowClick} key={mapKey} />
    </div>
  );
}

export default PayableForm;
