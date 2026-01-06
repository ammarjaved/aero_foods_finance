import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import ExpenseTable from "./ExpenseTable";

const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const dayOfWeek = sevenDaysAgo.getDay();

// Expense types from the image
const EXPENSE_TYPES = ["Rental", "Utilities", "Stock", "Logistik", "Claim"];

function ExpenseFormComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
    day: dayOfWeek,
    expense_type_name: "",
    vendor: "",
    amount: "",
    remarks: "",
    expense_recipt: null,
  });

  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());
  const [showImageModal, setShowImageModal] = useState(false);

  const handleChange = async (e) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          alert("Please upload an image file");
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("File size must be less than 5MB");
          return;
        }

        // Convert to base64 immediately
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          setFormData({
            ...formData,
            expense_recipt: base64String,
          });
          setReceiptPreview(base64String);
        };
        reader.readAsDataURL(file);
      }
    } else {
      const updatedFormData = {
        ...formData,
        [name]: value,
      };
      setFormData(updatedFormData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.expense_type_name) {
      alert("Please select an expense type");
      return;
    }

    try {
      const submitData = {};

      // Build the object with form fields
      Object.keys(formData).forEach((key) => {
        let floatKeys = ["amount"];
        if (floatKeys.includes(key)) {
          submitData[key] = parseFloat(formData[key]).toFixed(2);
        } else {
          submitData[key] = formData[key];
        }
      });

      // Structure the request according to your PHP API expectations
      const requestData = {
        action: "save", // Specify the action
        username: localStorage.getItem("user"),
        records: [submitData],
      };

      // Make the API call
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/daily_expenditure.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      const result = await response.json();

      if (response.ok) {
        const savedRecord = result.results[0];
        const updatedRecord = {
          ...formData,
          id: savedRecord.id,
          expense_recipt: savedRecord.expense_recipt,
        };

        alert(
          result.message ||
            (isEditing
              ? "Record updated successfully"
              : "Record added successfully")
        );

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

  const resetForm = () => {
    setFormData({
      month_date: new Date().toISOString().split("T")[0],
      day: dayOfWeek,
      expense_type_name: "",
      vendor: "",
      amount: "",
      remarks: "",
      expense_recipt: null,
    });
    setReceiptPreview(null);
    setMapKey(Date.now());
    setIsEditing(false);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleRowClick = async (record) => {
    resetForm();

    const updatedRecord = {
      ...formData,
      ...record,
    };

    setFormData(updatedRecord);

    // If there's a receipt image path, construct the preview URL
    if (record.expense_recipt) {
      // Check if it's a path or base64
      if (record.expense_recipt.startsWith("data:image")) {
        setReceiptPreview(record.expense_recipt);
      } else {
        // It's a file path, construct full URL
        const imageUrl = `http://121.121.232.54:88/aero-foods/${record.expense_recipt}`;
        setReceiptPreview(imageUrl);
      }
    }

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
        `Are you sure you want to delete the expense for "${formData.vendor}" with amount ${formData.amount}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/delete_daily_expenditure.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: formData.id }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
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

  const removeReceipt = () => {
    setFormData({
      ...formData,
      expense_recipt: null,
    });
    setReceiptPreview(null);
  };

  const openImageModal = () => {
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Expenditure</h2>
        <button className="btn btn-primary" onClick={openNewForm}>
          + Add New Record
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
              {isEditing ? "Edit Record" : "Add New Record"}
            </h4>
            <button
              type="button"
              className="btn-close"
              onClick={closeForm}
              aria-label="Close"
            ></button>
          </div>

          <div>
            <div className="mb-3">
              <label className="form-label">Month Date</label>
              <input
                type="date"
                className="form-control"
                name="month_date"
                value={formData.month_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3" style={{ display: "none" }}>
              <label className="form-label">Day</label>
              <input
                type="number"
                className="form-control"
                name="day"
                value={formData.day}
                onChange={handleChange}
                min="0"
                max="6"
                required
              />
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

            <div className="mb-3">
              <label className="form-label">Vendor</label>
              <input
                type="text"
                className="form-control"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                disabled={formData.expense_type_name === "Claim"}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-control"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Receipt Image</label>
              <input
                type="file"
                className="form-control"
                name="expense_recipt"
                accept="image/*"
                onChange={handleChange}
              />
              <small className="text-muted">
                Max file size: 5MB (JPG, PNG, GIF)
              </small>
            </div>

            {receiptPreview && (
              <div className="mb-3">
                <label className="form-label">Receipt Preview</label>
                <div className="position-relative border rounded p-2 bg-light">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="img-fluid rounded"
                    style={{
                      maxHeight: "250px",
                      objectFit: "contain",
                      width: "100%",
                      cursor: "pointer",
                    }}
                    onClick={openImageModal}
                    title="Click to enlarge"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger position-absolute"
                    style={{ top: "10px", right: "10px" }}
                    onClick={removeReceipt}
                  >
                    ✕ Remove
                  </button>
                </div>
                <small className="text-muted d-block mt-1">
                  Click image to view larger version
                </small>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Remarks</label>
              <textarea
                className="form-control"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows="3"
                placeholder="Enter any additional notes..."
              ></textarea>
            </div>

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
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
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

      {/* Image Modal */}
      {showImageModal && receiptPreview && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={closeImageModal}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-transparent border-0">
              <div className="modal-header border-0 pb-0">
                <button
                  type="button"
                  className="btn-close btn-close-white ms-auto"
                  onClick={closeImageModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body text-center p-0">
                <img
                  src={receiptPreview}
                  alt="Receipt full size"
                  className="img-fluid rounded"
                  style={{
                    maxHeight: "85vh",
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <ExpenseTable onRowClick={handleRowClick} key={mapKey} />
    </div>
  );
}

export default ExpenseFormComponent;
