// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import TableWastage from "./TableWastage";

function WastageComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
    day: new Date().getDate(),
    utilities: 130,
    rental: 227,
    fccpp_value: 2.8,
    fccpp_wastage: 0,
    fccpp_cost: 0,
    fsar_cav_value: 2.8,
    fsar_cav_wastage: 0,
    fsar_cav_cost: 0,
    ftypp_value: 2.8,
    ftypp_wastage: 0,
    ftypp_cost: 0,
    total_before_discount: 0,
    discount: 0,
    final_total: 0,
  });

  const formMembers = [
    {
      key: "fccpp_wastage",
      label: "Wastage - Frozen Chicken Curry Potato Puff",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "fccpp_cost",
      label: "Cost - Frozen Chicken Curry Potato Puff",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "fsr_cav_wastage",
      label: "Wastage - Frozen Spring Roll",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "fsr_cav_cost",
      label: "Cost - Frozen Spring Roll",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "ftypp_wastage",
      label: "Wastage - Frozen Tom Yum Potato Puff",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "ftypp_cost",
      label: "Cost - Frozen Tom Yum Potato Puff",
      isReadOnly: true,
      badge: "bg-secondary",
    },
  ];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const API_BASE_URL = "http://121.121.232.54:88/abe-yus";

  const handleSum = () => {
    const total_before_discount = parseFloat(
      parseFloat(formData.fccpp_wastage || 0) +
        parseFloat(formData.fccpp_cost || 0) +
        parseFloat(formData.fsr_cav_wastage || 0) +
        parseFloat(formData.fsr_cav_cost || 0) +
        parseFloat(formData.ctc_cost || 0) +
        parseFloat(formData.ftypp_wastage || 0) +
        parseFloat(formData.ftypp_cost || 0)
    ).toFixed(2);
    formData.total_before_discount = total_before_discount;

    const final_total = parseFloat(
      parseFloat(formData.discount || 0) + parseFloat(total_before_discount)
    ).toFixed(2);
    formData.final_total = final_total;
  };

  const handleChange = async (e) => {
    const { name, value, type } = e.target;

    if (type !== "file") {
      // Create updated form data
      const updatedFormData = {
        ...formData,
        [name]: value,
      };

      // Jasmine Tea
      if (["fccpp_value", "fccpp_wastage", "fccpp_cost"].includes(name)) {
        // Calculate the sum for sales_walk_in
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.fccpp_value || 0) *
            parseFloat(updatedFormData.fccpp_wastage || 0)
        ).toFixed(2);

        // Update sales_walk_in with the calculated sum
        updatedFormData.fccpp_cost = calculate_value;
      }

      // Black Tea
      if (["fsr_cav_value", "fsr_cav_wastage", "fsr_cav_cost"].includes(name)) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.fsr_cav_value || 0) *
            parseFloat(updatedFormData.fsr_cav_wastage || 0)
        ).toFixed(2);
        updatedFormData.fsr_cav_cost = calculate_value;
      }

      // Milk Tea
      if (["ftypp_value", "ftypp_wastage", "ftypp_cost"].includes(name)) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.ftypp_value || 0) *
            parseFloat(updatedFormData.ftypp_wastage || 0)
        ).toFixed(2);
        updatedFormData.ftypp_cost = calculate_value;
      }

      setFormData(updatedFormData);
      handleSum();
    }
  };

  const handleSubmit = async (e) => {
    handleSum();
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
        "http://121.121.232.54:88/abe-yus/daily_wastage.php",
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

  const resetForm = () => {
    // Clean up existing preview URLs

    // Reset form data
    setFormData({
      month_date: new Date().toISOString().split("T")[0],
      day: new Date().getDate(),
      utilities: 130,
      rental: 227,
      fccpp_value: 2.8,
      fccpp_wastage: 0,
      fccpp_cost: 0,
      fsar_cav_value: 2.8,
      fsar_cav_wastage: 0,
      fsar_cav_cost: 0,
      ftypp_value: 2.8,
      ftypp_wastage: 0,
      ftypp_cost: 0,
      total_before_discount: 0,
      discount: 0,
      final_total: 0,
    });

    setMapKey(Date.now());
    setIsEditing(false);
  };

  const handleRowClick = async (record) => {
    // First completely reset the form to clear any previous values
    resetForm();

    // Create a new object with all form fields explicitly set
    const updatedRecord = {
      ...formData, // Start with the default empty values
      ...record, // Override with record values
    };

    let c_month = 0;
    if (localStorage.getItem("month")) {
      c_month = localStorage.getItem("month");
    } else {
      c_month = parseInt(new Date().getMonth()) + 1;
    }
    setFormData(updatedRecord);

    setMapKey(Date.now());
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div
              style={{ backgroundColor: "#e80000" }}
              className="card-header  text-white d-flex justify-content-between align-items-center"
            >
              <h2 className="mb-0">Daily Wastage</h2>
            </div>
          </div>
          <div className="card-body">
            <TableWastage onRowClick={handleRowClick} />
          </div>
        </div>
      </div>

      {/* Sliding Form */}
      <div
        className="position-fixed top-0 end-0 h-100 bg-white shadow-lg"
        style={{
          width: "500px",
          transform: isFormOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
          zIndex: 1050,
          overflowY: "auto",
        }}
      >
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>{isEditing ? "Edit Wastage Record" : "New Wastage Record"}</h3>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={closeForm}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-2">
              <div className="col-md-12 mt-4 d-flex justify-content-center">
                <div className="form-group badge bg-dark text-light">
                  <label className="form-label">Month Date</label>
                  <input
                    type="date"
                    name="month_date"
                    value={formData.month_date}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>

              <div className="col-md-12 d-flex justify-content-center">
                <div className={`form-group badge bg-success`}>
                  <label className="form-label">Total Wastage</label>
                  <input
                    type="number"
                    name="total_before_discount"
                    value={formData.total_before_discount}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                    required
                  />
                </div>
              </div>

              <div className="col-md-6 d-flex justify-content-center">
                <div className={`form-group badge bg-success`}>
                  <label className="form-label">100% Discount Amount</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                    required
                  />
                </div>
              </div>

              <div className="col-md-6 d-flex justify-content-center">
                <div className={`form-group badge bg-success`}>
                  <label className="form-label">Wastage Amount</label>
                  <input
                    type="number"
                    name="final_total"
                    value={formData.final_total}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                    required
                  />
                </div>
              </div>

              {formMembers.map((item, index) => (
                <div
                  className="col-md-6 d-flex justify-content-center"
                  key={index}
                >
                  <div className={`form-group badge ${item.badge}`}>
                    <label className="form-label">{item.label}</label>
                    <input
                      type="number"
                      name={item.key}
                      value={formData[item.key]}
                      onChange={handleChange}
                      className="form-control"
                      readOnly={item.isReadOnly}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 d-flex justify-content-center">
              <button type="submit" className="btn btn-success">
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
        ></div>
      )}
    </div>
  );
}

export default WastageComponent;
