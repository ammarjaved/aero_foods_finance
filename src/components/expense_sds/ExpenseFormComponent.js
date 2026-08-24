// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import ExpenseTable from "./ExpenseTable";
import { canEdit } from "../../roles";

const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const dayOfWeek = sevenDaysAgo.getDay();

const EXPENSE_TYPES = [
  "Rental",
  "Utilities",
  "Stock",
  "Logistik",
  "Claim",
  "Salary",
  "Advance",
  "Others",
];

// Helper function to get local date in YYYY-MM-DD format
function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ExpenseFormComponent() {
  // Initial default record
  const [defaultRecord] = useState(() => ({
    month_date: getLocalDateString(),
    day: dayOfWeek,
    expense_type_name: "",
    company: "",
    vendor: "",
    amount: "",
    remarks: "",
    expense_recipt: null,
  }));

  // For multiple records mode
  const [formRecords, setFormRecords] = useState([{ ...defaultRecord }]);
  // For single record editing mode
  const [editFormData, setEditFormData] = useState({ ...defaultRecord });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  // Image preview states
  const [recordPreviews, setRecordPreviews] = useState({});
  const [editPreview, setEditPreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState(null);

  const handleRecordChange = (index, e) => {
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

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          const updatedRecords = [...formRecords];
          updatedRecords[index] = {
            ...updatedRecords[index],
            expense_recipt: base64String,
          };
          setFormRecords(updatedRecords);

          // Update preview
          setRecordPreviews({
            ...recordPreviews,
            [index]: base64String,
          });
        };
        reader.readAsDataURL(file);
      }
    } else {
      const updatedRecords = [...formRecords];
      updatedRecords[index] = {
        ...updatedRecords[index],
        [name]: value,
      };
      setFormRecords(updatedRecords);
    }
  };

  const handleEditChange = (e) => {
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

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          setEditFormData({
            ...editFormData,
            expense_recipt: base64String,
          });
          setEditPreview(base64String);
        };
        reader.readAsDataURL(file);
      }
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value,
      });
    }
  };

  const removeRecordImage = (index) => {
    const updatedRecords = [...formRecords];
    updatedRecords[index] = {
      ...updatedRecords[index],
      expense_recipt: null,
    };
    setFormRecords(updatedRecords);

    const updatedPreviews = { ...recordPreviews };
    delete updatedPreviews[index];
    setRecordPreviews(updatedPreviews);
  };

  const removeEditImage = () => {
    setEditFormData({
      ...editFormData,
      expense_recipt: null,
    });
    setEditPreview(null);
  };

  const openImageModal = (imageSrc) => {
    setModalImageSrc(imageSrc);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImageSrc(null);
  };

  const addNewRecord = () => {
    const newRecord = {
      month_date: getLocalDateString(),
      day: dayOfWeek,
      expense_type_name: "",
      company: "",
      vendor: "",
      amount: "",
      remarks: "",
      expense_recipt: null,
    };
    setFormRecords([...formRecords, newRecord]);
  };

  const removeRecord = (index) => {
    if (formRecords.length > 1) {
      const updatedRecords = formRecords.filter((_, i) => i !== index);
      setFormRecords(updatedRecords);

      // Clean up preview
      const updatedPreviews = { ...recordPreviews };
      delete updatedPreviews[index];
      setRecordPreviews(updatedPreviews);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate expense_type_name
    if (isEditing) {
      if (
        !editFormData.expense_type_name ||
        editFormData.expense_type_name.trim() === ""
      ) {
        alert("Please select an Expense Type");
        return;
      }
      if (!editFormData.company || editFormData.company.trim() === "") {
        alert("Please select a Company");
        return;
      }
      if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
        alert("Please enter a valid Amount");
        return;
      }
    } else {
      for (let i = 0; i < formRecords.length; i++) {
        const record = formRecords[i];
        if (
          !record.expense_type_name ||
          record.expense_type_name.trim() === ""
        ) {
          alert(`Please select an Expense Type for Record #${i + 1}`);
          return;
        }
        if (!record.company || record.company.trim() === "") {
          alert(`Please select a Company for Record #${i + 1}`);
          return;
        }
        if (!record.amount || parseFloat(record.amount) <= 0) {
          alert(`Please enter a valid Amount for Record #${i + 1}`);
          return;
        }
      }
    }

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
      month_date: getLocalDateString(),
      day: dayOfWeek,
      expense_type_name: "",
      company: "",
      vendor: "",
      amount: "",
      remarks: "",
      expense_recipt: null,
    };
    setFormRecords([freshRecord]);
    setEditFormData(freshRecord);
    setRecordPreviews({});
    setEditPreview(null);
    setMapKey(Date.now());
    setIsEditing(false);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleRowClick = async (record) => {
    resetForm();
    const baseRecord = {
      month_date: getLocalDateString(),
      day: dayOfWeek,
      expense_type_name: "",
      company: "",
      vendor: "",
      amount: "",
      remarks: "",
      expense_recipt: null,
    };
    setEditFormData({ ...baseRecord, ...record });

    // If there's an expense_recipt, set the preview
    if (record.expense_recipt) {
      if (record.expense_recipt.startsWith("data:image")) {
        setEditPreview(record.expense_recipt);
      } else {
        // It's a file path, construct full URL based on company
        let basePath = "aero-foods"; // default
        const company = record.company
          ? record.company.toLowerCase().trim()
          : "";

        if (company === "amazon") {
          basePath = "amazon-cafe";
        } else if (company === "abe yus" || company === "abe") {
          basePath = "abe-yus";
        } else if (company === "ojim") {
          basePath = "ojim-cafe";
        } else if (company === "mixue sogo") {
          basePath = "mixue-sogo";
        } else if (company === "amazon_lyp") {
          basePath = "amazon-cafe-lyp";
        } else if (
          company === "mixue" ||
          company === "sds hq" ||
          company === "sds" ||
          company === "allmas mixue"
        ) {
          basePath = "aero-foods";
        }

        const imageUrl = `http://121.121.232.54:88/${basePath}/${record.expense_recipt}`;
        setEditPreview(imageUrl);
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
        `Are you sure you want to delete the expense for "${editFormData.vendor}" with amount ${editFormData.amount}?`,
      )
    ) {
      return;
    }

    try {
      // Prepare delete payload with source information
      const deletePayload = {
        id: editFormData.id,
      };

      // Include source database and table if available
      if (editFormData.source_database) {
        deletePayload.source_database = editFormData.source_database;
      }
      if (editFormData.source_table) {
        deletePayload.source_table = editFormData.source_table;
      }

      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/delete_sds_expenditure.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deletePayload),
        },
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

  const allowEdit = canEdit();
  const isDeleteEnabled =
    allowEdit &&
    isEditing &&
    (editFormData.company === "SDS HQ" || !editFormData.company);

  const renderRecordForm = (record, index, isEditMode = false) => {
    const handleChange = isEditMode
      ? handleEditChange
      : (e) => handleRecordChange(index, e);
    const formData = isEditMode ? editFormData : record;
    const preview = isEditMode ? editPreview : recordPreviews[index];
    const removeImage = isEditMode
      ? removeEditImage
      : () => removeRecordImage(index);

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
                <label className="form-label">Company</label>
                <select
                  className="form-select"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  disabled={isEditMode}
                  required
                >
                  <option value="">Select a company</option>
                  <option value="Mixue">Mixue</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Amazon LYP">Amazon LYP</option>
                  <option value="Abe Yus">Abe Yus</option>
                  <option value="Ojim">Ojim</option>
                  <option value="Mixue Sogo">Mixue Sogo</option>
                  <option value="SDS HQ">SDS HQ</option>
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

              {preview && (
                <div className="mb-3">
                  <label className="form-label">Receipt Preview</label>
                  <div className="position-relative border rounded p-2 bg-light">
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="img-fluid rounded"
                      style={{
                        maxHeight: "250px",
                        objectFit: "contain",
                        width: "100%",
                        cursor: "pointer",
                      }}
                      onClick={() => openImageModal(preview)}
                      title="Click to enlarge"
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute"
                      style={{ top: "10px", right: "10px" }}
                      onClick={removeImage}
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
                  rows="2"
                />
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
        <h2 className="mb-0">SDS HQ</h2>
        {allowEdit && (
          <button className="btn btn-primary" onClick={openNewForm}>
            + Add New Record
          </button>
        )}
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
              {isEditing ? "Edit Record" : "Add New Records"}
            </h4>
            <button
              type="button"
              className="btn-close"
              onClick={closeForm}
              aria-label="Close"
            ></button>
          </div>

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
                  + Add Another Record
                </button>
              </div>
            </>
          )}

          <div className="d-flex gap-2 pt-3 border-top">
            {isDeleteEnabled && (
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
            {allowEdit && (
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
            )}
          </div>
        </div>
      </div>

      {/* Overlay when form is open */}
      {isFormOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          // onClick={closeForm}
        ></div>
      )}

      {/* Image Modal */}
      {showImageModal && modalImageSrc && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1060 }}
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
                  src={modalImageSrc}
                  alt="Full size view"
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
