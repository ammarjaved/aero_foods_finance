// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import TableMaterials from "./TableMaterials";

function MaterialsComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
    day: new Date().getDate(),
    month: 1,
    year: 2025,
    code: "3010009",
    name: "Ice Cream Machine",
    description: "冰淇淋机Ice Cream Machine",
    category: "Equipment",
    unit_price: "16800",
    packet: "1",
    unit: "pcs",
    created_at: "2025-05-23 13:51:08.528691",
    updated_at: "2025-05-23 13:51:08.528691",
    created_by: "",
    updated_by: "",
  });

  const formMembers = [
    {
      key: "code",
      label: "Item Code",
      isReadOnly: true,
      badge: "bg-success",
      type: "text",
    },
    {
      key: "name",
      label: "Item Name",
      isReadOnly: true,
      badge: "bg-success",
      type: "text",
    },
    {
      key: "description",
      label: "Description",
      isReadOnly: true,
      badge: "bg-success",
      type: "text",
    },
    {
      key: "unit_price",
      label: "Unit Price",
      isReadOnly: false,
      badge: "bg-danger",
      type: "number",
    },
    {
      key: "packet",
      label: "Packet",
      isReadOnly: false,
      badge: "bg-danger",
      type: "number",
    },
    {
      key: "unit",
      label: "Unit",
      isReadOnly: true,
      badge: "bg-danger",
      type: "dropdown",
      options: ["can", "bottle", "pcs", "roll", "box", "pack", "set", "kg"],
    },
  ];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

  const handleSum = () => {
    const total_before_discount = parseFloat(
      parseFloat(formData.jasmine_tea_cost || 0) +
        parseFloat(formData.black_tea_cost || 0) +
        parseFloat(formData.milk_tea_cost || 0) +
        parseFloat(formData.coffee_cost || 0) +
        parseFloat(formData.ctc_cost || 0) +
        parseFloat(formData.yellow_peach_jelly_cost || 0) +
        parseFloat(formData.brown_sugar_jelly_cost || 0) +
        parseFloat(formData.peal_cost || 0) +
        parseFloat(formData.ice_cream_cost || 0) +
        parseFloat(formData.melon_ice_cream_cost || 0) +
        parseFloat(formData.oreo_cost || 0) +
        parseFloat(formData.yellow_peach_jam_cost || 0) +
        parseFloat(formData.pink_peach_jam_cost || 0) +
        parseFloat(formData.kiwi_jam_cost || 0) +
        parseFloat(formData.strawberry_jam_cost || 0) +
        parseFloat(formData.mango_jam_cost || 0) +
        parseFloat(formData.passion_fruit_jam_cost || 0) +
        parseFloat(formData.nata_de_coco_cost || 0) +
        parseFloat(formData.lemon_cost || 0)
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
        "http://121.121.232.54:88/aero-foods/materials.php",
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
      month: 1,
      year: 2025,
      code: "",
      name: "",
      description: "",
      category: "",
      unit_price: "",
      packet: "1",
      unit: "pcs",
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
              <h2 className="mb-0">Materials</h2>
            </div>
          </div>
          <div className="card-body">
            <TableMaterials onRowClick={handleRowClick} />
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

              {formMembers.map((item, index) => {
                return item.type === "dropdown" ? (
                  <div
                    className="col-md-6 d-flex justify-content-center"
                    key={index}
                  >
                    <div className={`form-group badge ${item.badge}`}>
                      <label className="form-label">{item.label}</label>
                      <select
                        className="form-select"
                        value={formData[item.key]}
                        onChange={handleChange}
                        readOnly={item.isReadOnly}
                        required
                      >
                        <option value="">Select</option>
                        {item.options.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div
                    className="col-md-6 d-flex justify-content-center"
                    key={index}
                  >
                    <div className={`form-group badge ${item.badge}`}>
                      <label className="form-label">{item.label}</label>
                      <input
                        type={item.type}
                        name={item.key}
                        value={formData[item.key]}
                        onChange={handleChange}
                        className="form-control"
                        readOnly={item.isReadOnly}
                        required
                      />
                    </div>
                  </div>
                );
              })}
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

export default MaterialsComponent;
