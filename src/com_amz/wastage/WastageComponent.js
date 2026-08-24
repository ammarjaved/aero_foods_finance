// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import TableWastage from "./TableWastage";

function WastageComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
    day: new Date().getDate(),
    utilities: "0",
    rental: "0",
    nasi_value: "0.006",
    nasi_wastage: "0",
    nasi_cost: "0",
    nasi_lamak_value: "0.006",
    nasi_lamak_wastage: "0",
    nasi_lamak_cost: "0",
    boil_egg_value: "0.5",
    boil_egg_wastage: "0",
    boil_egg_cost: "0",
    cpc_value: "3",
    cpc_wastage: "0",
    cpc_cost: "0",
    cpt_value: "3",
    cpt_wastage: "0",
    cpt_cost: "0",
    spring_roll_value: "3",
    spring_roll_wastage: "0",
    spring_roll_cost: "0",
    toast_bread_value: "0.013",
    toast_bread_wastage: "0",
    toast_bread_cost: "0",
    leamon_value: "0.006",
    leamon_wastage: "0",
    leamon_cost: "0",
    chicken_value: "4",
    chicken_wastage: "0",
    chicken_cost: "0",
    timun_value: "0.004",
    timun_wastage: "0",
    timun_cost: "0",
    black_tea_value: "0.018",
    black_tea_wastage: "0",
    black_tea_cost: "0",
    coffee_value: "0.0019745",
    coffee_wastage: "0",
    coffee_cost: "0",
    tea_value: "0.00072",
    tea_wastage: "0",
    tea_cost: "0",
    total_before_discount: "0",
    discount: "0",
    final_total: "0",
  });

  const formMembers = [
    {
      key: "final_total",
      label: "Total Wastage",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "discount",
      label: "100% Discount Amount",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "total_before_discount",
      label: "Wastage Amount",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "nasi_wastage",
      label: "Wastage - Nasi",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "nasi_cost",
      label: "Cost - Nasi",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "nasi_lamak_wastage",
      label: "Wastage - Nasi Lamak",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "nasi_lamak_cost",
      label: "Cost - Nasi Lamak",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "boil_egg_wastage",
      label: "Wastage - Soft Boil Egg",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "boil_egg_cost",
      label: "Cost - Soft Boil Egg",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "cpc_wastage",
      label: "Wastage - Curry Puff Chicken",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "cpc_cost",
      label: "Cost - Curry Puff Chicken",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "cpt_wastage",
      label: "Wastage - Curry Puff Tomyam",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "cpt_cost",
      label: "Cost - Curry Puff Tomyam",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "spring_roll_wastage",
      label: "Wastage - Spring Roll",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "spring_roll_cost",
      label: "Cost - Spring Roll",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "toast_bread_wastage",
      label: "Wastage - Toast Bread",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "toast_bread_cost",
      label: "Cost - Toast Bread",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "leamon_wastage",
      label: "Wastage - Lemon",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "leamon_cost",
      label: "Cost - Lemon",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "chicken_wastage",
      label: "Wastage - Chicken",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "chicken_cost",
      label: "Cost - Chicken",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "timun_wastage",
      label: "Wastage - Timun",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "timun_cost",
      label: "Cost - Timun",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "black_tea_wastage",
      label: "Wastage - Black Tea",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "black_tea_cost",
      label: "Cost - Black Tea",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "coffee_wastage",
      label: "Wastage - Coffee",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "coffee_cost",
      label: "Cost - Coffee",
      isReadOnly: true,
      badge: "bg-danger",
    },
    {
      key: "tea_wastage",
      label: "Wastage - Tea",
      isReadOnly: false,
      badge: "bg-primary",
    },
    {
      key: "tea_cost",
      label: "Cost - Tea",
      isReadOnly: true,
      badge: "bg-danger",
    },
  ];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const API_BASE_URL = "http://121.121.232.54:88/amazon-cafe";

  const handleSum = () => {
    // Sum all cost fields for the new items
    const total_before_discount = parseFloat(
      parseFloat(formData.nasi_cost || 0) +
        parseFloat(formData.nasi_lamak_cost || 0) +
        parseFloat(formData.boil_egg_cost || 0) +
        parseFloat(formData.cpc_cost || 0) +
        parseFloat(formData.cpt_cost || 0) +
        parseFloat(formData.spring_roll_cost || 0) +
        parseFloat(formData.toast_bread_cost || 0) +
        parseFloat(formData.leamon_cost || 0) + // Note: corrected spelling
        parseFloat(formData.chicken_cost || 0) +
        parseFloat(formData.timun_cost || 0) +
        parseFloat(formData.black_tea_cost || 0) +
        parseFloat(formData.coffee_cost || 0) +
        parseFloat(formData.tea_cost || 0)
    ).toFixed(2);

    formData.total_before_discount = total_before_discount;

    // Calculate final total (discount + wastage amount)
    const final_total = parseFloat(
      parseFloat(formData.discount || 0) + parseFloat(total_before_discount)
    ).toFixed(2);

    formData.final_total = final_total;
  };
  // Replace your handleChange function with this:

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };

    // Define item groups with their value/wastage/cost fields
    const itemGroups = [
      { value: "nasi_value", wastage: "nasi_wastage", cost: "nasi_cost" },
      {
        value: "nasi_lamak_value",
        wastage: "nasi_lamak_wastage",
        cost: "nasi_lamak_cost",
      },
      {
        value: "boil_egg_value",
        wastage: "boil_egg_wastage",
        cost: "boil_egg_cost",
      },
      { value: "cpc_value", wastage: "cpc_wastage", cost: "cpc_cost" },
      { value: "cpt_value", wastage: "cpt_wastage", cost: "cpt_cost" },
      {
        value: "spring_roll_value",
        wastage: "spring_roll_wastage",
        cost: "spring_roll_cost",
      },
      {
        value: "toast_bread_value",
        wastage: "toast_bread_wastage",
        cost: "toast_bread_cost",
      },
      { value: "leamon_value", wastage: "leamon_wastage", cost: "leamon_cost" },
      {
        value: "chicken_value",
        wastage: "chicken_wastage",
        cost: "chicken_cost",
      },
      {
        value: "timun_value",
        wastage: "timun_wastage",
        cost: "timun_cost",
      },
      {
        value: "black_tea_value",
        wastage: "black_tea_wastage",
        cost: "black_tea_cost",
      },
      {
        value: "coffee_value",
        wastage: "coffee_wastage",
        cost: "coffee_cost",
      },
      {
        value: "tea_value",
        wastage: "tea_wastage",
        cost: "tea_cost",
      },
    ];

    // Process each item group
    itemGroups.forEach((group) => {
      if ([group.value, group.wastage, group.cost].includes(name)) {
        const costValue = parseFloat(
          parseFloat(updatedFormData[group.value] || 0) *
            parseFloat(updatedFormData[group.wastage] || 0)
        ).toFixed(2);

        updatedFormData[group.cost] = costValue;
      }
    });

    setFormData(updatedFormData);

    // Calculate totals after state update
    setTimeout(() => handleSum(), 0);
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
        "http://121.121.232.54:88/amazon-cafe/daily_wastage.php",
        {
          method: "POST",
          body: submitData, // No need to set Content-Type header; browser will set it properly with boundary
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(result.message);

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
      utilities: "0",
      rental: "0",
      nasi_value: "0.006",
      nasi_wastage: "0",
      nasi_cost: "0",
      nasi_lamak_value: "0.006",
      nasi_lamak_wastage: "0",
      nasi_lamak_cost: "0",
      boil_egg_value: "0.5",
      boil_egg_wastage: "0",
      boil_egg_cost: "0",
      cpc_value: "3",
      cpc_wastage: "0",
      cpc_cost: "0",
      cpt_value: "3",
      cpt_wastage: "0",
      cpt_cost: "0",
      spring_roll_value: "3",
      spring_roll_wastage: "0",
      spring_roll_cost: "0",
      toast_bread_value: "0.013",
      toast_bread_wastage: "0",
      toast_bread_cost: "0",
      leamon_value: "0.006",
      leamon_wastage: "0",
      leamon_cost: "0",
      chicken_value: "4",
      chicken_wastage: "0",
      chicken_cost: "0",
      timun_value: "0.004",
      timun_wastage: "0",
      timun_cost: "0",
      black_tea_value: "0.018",
      black_tea_wastage: "0",
      black_tea_cost: "0",
      coffee_value: "0.0019745",
      coffee_wastage: "0",
      coffee_cost: "0",
      tea_value: "0.00072",
      tea_wastage: "0",
      tea_cost: "0",
      total_before_discount: "0",
      discount: "0",
      final_total: "0",
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
              <h2 className="mb-0">Daily Wastage (D' Amazon Cafe)</h2>
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
