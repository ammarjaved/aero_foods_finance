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
    jasmine_tea_value: 0.0023,
    jasmine_tea_wastage: 0,
    jasmine_tea_cost: 0,
    black_tea_value: 0.0024,
    black_tea_wastage: 0,
    black_tea_cost: 0,
    milk_tea_value: 0.0054,
    milk_tea_wastage: 0,
    milk_tea_cost: 0,
    coffee_value: 0.006,
    coffee_wastage: 0,
    coffee_cost: 0,
    ctc_value: 0.0064,
    ctc_wastage: 0,
    ctc_cost: 0,
    yellow_peach_jelly_value: 0.0037,
    yellow_peach_jelly_wastage: 0,
    yellow_peach_jelly_cost: 0,
    brown_sugar_jelly_value: 0.0046,
    brown_sugar_jelly_wastage: 0,
    brown_sugar_jelly_cost: 0,
    peal_value: 0.0058,
    peal_wastage: 0,
    peal_cost: 0,
    ice_cream_value: 0.0061,
    ice_cream_wastage: 0,
    ice_cream_cost: 0,
    melon_ice_cream_value: 0.0061,
    melon_ice_cream_wastage: 0,
    melon_ice_cream_cost: 0,
    oreo_value: 0.0219,
    oreo_wastage: 0,
    oreo_cost: 0,
    yellow_peach_jam_value: 0.0101,
    yellow_peach_jam_wastage: 0,
    yellow_peach_jam_cost: 0,
    pink_peach_jam_value: 0.0113,
    pink_peach_jam_wastage: 0,
    pink_peach_jam_cost: 0,
    kiwi_jam_value: 0.0116,
    kiwi_jam_wastage: 0,
    kiwi_jam_cost: 0,
    strawberry_jam_value: 0.0099,
    strawberry_jam_wastage: 0,
    strawberry_jam_cost: 0,
    mango_jam_value: 0.0179,
    mango_jam_wastage: 0,
    mango_jam_cost: 0,
    passion_fruit_jam_value: 0.0174,
    passion_fruit_jam_wastage: 0,
    passion_fruit_jam_cost: 0,
    nata_de_coco_value: 0.0047,
    nata_de_coco_wastage: 0,
    nata_de_coco_cost: 0,
    lemon_value: 0.0053,
    lemon_wastage: 0,
    lemon_cost: 0,
    total_before_discount: 0,
    discount: 0,
    final_total: 0,
  });

  const formMembers = [
    {
      key: "jasmine_tea_wastage",
      label: "Jasmine Tea Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "jasmine_tea_cost",
      label: "Jasmine Tea Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "black_tea_wastage",
      label: "Black Tea Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "black_tea_cost",
      label: "Black Tea Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "milk_tea_wastage",
      label: "Milk Tea Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "milk_tea_cost",
      label: "Milk Tea Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "coffee_wastage",
      label: "Coffee Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "coffee_cost",
      label: "Coffee Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "ctc_wastage",
      label: "CTC Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "ctc_cost",
      label: "CTC Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "yellow_peach_jelly_wastage",
      label: "Yellow Peach Jelly Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "yellow_peach_jelly_cost",
      label: "Yellow Peach Jelly Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "brown_sugar_jelly_wastage",
      label: "Brown Sugar Jelly Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "brown_sugar_jelly_cost",
      label: "Brown Sugar Jelly Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "peal_wastage",
      label: "Peal Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "peal_cost",
      label: "Peal Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "ice_cream_wastage",
      label: "Ice Cream Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "ice_cream_cost",
      label: "Ice Cream Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "melon_ice_cream_wastage",
      label: "Melon Ice Cream Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "melon_ice_cream_cost",
      label: "Melon Ice Cream Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "oreo_wastage",
      label: "Oreo Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "oreo_cost",
      label: "Oreo Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "yellow_peach_jam_wastage",
      label: "Yellow Peach Jam Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "yellow_peach_jam_cost",
      label: "Yellow Peach Jam Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "pink_peach_jam_wastage",
      label: "Pink Peach Jam Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "pink_peach_jam_cost",
      label: "Pink Peach Jam Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "kiwi_jam_wastage",
      label: "Kiwi Jam Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "kiwi_jam_cost",
      label: "Kiwi Jam Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "strawberry_jam_wastage",
      label: "Strawberry Jam Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "strawberry_jam_cost",
      label: "Strawberry Jam Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "mango_jam_wastage",
      label: "Mango Jam Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "mango_jam_cost",
      label: "Mango Jam Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "passion_fruit_jam_wastage",
      label: "Passion Fruit Jam Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "passion_fruit_jam_cost",
      label: "Passion Fruit Jam Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "nata_de_coco_wastage",
      label: "Nata De Coco Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "nata_de_coco_cost",
      label: "Nata De Coco Cost",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "lemon_wastage",
      label: "Lemon Wastage",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "lemon_cost",
      label: "Lemon Cost",
      isReadOnly: true,
      badge: "bg-secondary",
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

      // Jasmine Tea
      if (
        [
          "jasmine_tea_value",
          "jasmine_tea_wastage",
          "jasmine_tea_cost",
        ].includes(name)
      ) {
        // Calculate the sum for sales_walk_in
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.jasmine_tea_value || 0) *
            parseFloat(updatedFormData.jasmine_tea_wastage || 0)
        ).toFixed(2);

        // Update sales_walk_in with the calculated sum
        updatedFormData.jasmine_tea_cost = calculate_value;
      }

      // Black Tea
      if (
        ["black_tea_value", "black_tea_wastage", "black_tea_cost"].includes(
          name
        )
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.black_tea_value || 0) *
            parseFloat(updatedFormData.black_tea_wastage || 0)
        ).toFixed(2);
        updatedFormData.black_tea_cost = calculate_value;
      }

      // Milk Tea
      if (
        ["milk_tea_value", "milk_tea_wastage", "milk_tea_cost"].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.milk_tea_value || 0) *
            parseFloat(updatedFormData.milk_tea_wastage || 0)
        ).toFixed(2);
        updatedFormData.milk_tea_cost = calculate_value;
      }

      // Coffee
      if (["coffee_value", "coffee_wastage", "coffee_cost"].includes(name)) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.coffee_value || 0) *
            parseFloat(updatedFormData.coffee_wastage || 0)
        ).toFixed(2);
        updatedFormData.coffee_cost = calculate_value;
      }

      // CTC
      if (["ctc_value", "ctc_wastage", "ctc_cost"].includes(name)) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.ctc_value || 0) *
            parseFloat(updatedFormData.ctc_wastage || 0)
        ).toFixed(2);
        updatedFormData.ctc_cost = calculate_value;
      }

      // Yellow Peach Jelly
      if (
        [
          "yellow_peach_jelly_value",
          "yellow_peach_jelly_wastage",
          "yellow_peach_jelly_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.yellow_peach_jelly_value || 0) *
            parseFloat(updatedFormData.yellow_peach_jelly_wastage || 0)
        ).toFixed(2);
        updatedFormData.yellow_peach_jelly_cost = calculate_value;
      }

      // Brown Sugar Jelly
      if (
        [
          "brown_sugar_jelly_value",
          "brown_sugar_jelly_wastage",
          "brown_sugar_jelly_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.brown_sugar_jelly_value || 0) *
            parseFloat(updatedFormData.brown_sugar_jelly_wastage || 0)
        ).toFixed(2);
        updatedFormData.brown_sugar_jelly_cost = calculate_value;
      }

      // Peal
      if (["peal_value", "peal_wastage", "peal_cost"].includes(name)) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.peal_value || 0) *
            parseFloat(updatedFormData.peal_wastage || 0)
        ).toFixed(2);
        updatedFormData.peal_cost = calculate_value;
      }

      // Ice Cream
      if (
        ["ice_cream_value", "ice_cream_wastage", "ice_cream_cost"].includes(
          name
        )
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.ice_cream_value || 0) *
            parseFloat(updatedFormData.ice_cream_wastage || 0)
        ).toFixed(2);
        updatedFormData.ice_cream_cost = calculate_value;
      }

      // Melon Ice Cream
      if (
        [
          "melon_ice_cream_value",
          "melon_ice_cream_wastage",
          "melon_ice_cream_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.melon_ice_cream_value || 0) *
            parseFloat(updatedFormData.melon_ice_cream_wastage || 0)
        ).toFixed(2);
        updatedFormData.melon_ice_cream_cost = calculate_value;
      }

      // Oreo
      if (["oreo_value", "oreo_wastage", "oreo_cost"].includes(name)) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.oreo_value || 0) *
            parseFloat(updatedFormData.oreo_wastage || 0)
        ).toFixed(2);
        updatedFormData.oreo_cost = calculate_value;
      }

      // Yellow Peach Jam
      if (
        [
          "yellow_peach_jam_value",
          "yellow_peach_jam_wastage",
          "yellow_peach_jam_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.yellow_peach_jam_value || 0) *
            parseFloat(updatedFormData.yellow_peach_jam_wastage || 0)
        ).toFixed(2);
        updatedFormData.yellow_peach_jam_cost = calculate_value;
      }

      // Pink Peach Jam
      if (
        [
          "pink_peach_jam_value",
          "pink_peach_jam_wastage",
          "pink_peach_jam_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.pink_peach_jam_value || 0) *
            parseFloat(updatedFormData.pink_peach_jam_wastage || 0)
        ).toFixed(2);
        updatedFormData.pink_peach_jam_cost = calculate_value;
      }

      // Kiwi Jam
      if (
        ["kiwi_jam_value", "kiwi_jam_wastage", "kiwi_jam_cost"].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.kiwi_jam_value || 0) *
            parseFloat(updatedFormData.kiwi_jam_wastage || 0)
        ).toFixed(2);
        updatedFormData.kiwi_jam_cost = calculate_value;
      }

      // Strawberry Jam
      if (
        [
          "strawberry_jam_value",
          "strawberry_jam_wastage",
          "strawberry_jam_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.strawberry_jam_value || 0) *
            parseFloat(updatedFormData.strawberry_jam_wastage || 0)
        ).toFixed(2);
        updatedFormData.strawberry_jam_cost = calculate_value;
      }

      // Mango Jam
      if (
        ["mango_jam_value", "mango_jam_wastage", "mango_jam_cost"].includes(
          name
        )
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.mango_jam_value || 0) *
            parseFloat(updatedFormData.mango_jam_wastage || 0)
        ).toFixed(2);
        updatedFormData.mango_jam_cost = calculate_value;
      }

      // Passion Fruit Jam
      if (
        [
          "passion_fruit_jam_value",
          "passion_fruit_jam_wastage",
          "passion_fruit_jam_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.passion_fruit_jam_value || 0) *
            parseFloat(updatedFormData.passion_fruit_jam_wastage || 0)
        ).toFixed(2);
        updatedFormData.passion_fruit_jam_cost = calculate_value;
      }

      // Nata De Coco
      if (
        [
          "nata_de_coco_value",
          "nata_de_coco_wastage",
          "nata_de_coco_cost",
        ].includes(name)
      ) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.nata_de_coco_value || 0) *
            parseFloat(updatedFormData.nata_de_coco_wastage || 0)
        ).toFixed(2);
        updatedFormData.nata_de_coco_cost = calculate_value;
      }

      // Lemon
      if (["lemon_value", "lemon_wastage", "lemon_cost"].includes(name)) {
        const calculate_value = parseFloat(
          parseFloat(updatedFormData.lemon_value || 0) *
            parseFloat(updatedFormData.lemon_wastage || 0)
        ).toFixed(2);
        updatedFormData.lemon_cost = calculate_value;
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
        "http://121.121.232.54:88/aero-foods/daily_wastage.php",
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
      jasmine_tea_value: 0.0023,
      jasmine_tea_wastage: 0,
      jasmine_tea_cost: 0,
      black_tea_value: 0.0024,
      black_tea_wastage: 0,
      black_tea_cost: 0,
      milk_tea_value: 0.0054,
      milk_tea_wastage: 0,
      milk_tea_cost: 0,
      coffee_value: 0.006,
      coffee_wastage: 0,
      coffee_cost: 0,
      ctc_value: 0.0064,
      ctc_wastage: 0,
      ctc_cost: 0,
      yellow_peach_jelly_value: 0.0037,
      yellow_peach_jelly_wastage: 0,
      yellow_peach_jelly_cost: 0,
      brown_sugar_jelly_value: 0.0046,
      brown_sugar_jelly_wastage: 0,
      brown_sugar_jelly_cost: 0,
      peal_value: 0.0058,
      peal_wastage: 0,
      peal_cost: 0,
      ice_cream_value: 0.0061,
      ice_cream_wastage: 0,
      ice_cream_cost: 0,
      melon_ice_cream_value: 0.0061,
      melon_ice_cream_wastage: 0,
      melon_ice_cream_cost: 0,
      oreo_value: 0.0219,
      oreo_wastage: 0,
      oreo_cost: 0,
      yellow_peach_jam_value: 0.0101,
      yellow_peach_jam_wastage: 0,
      yellow_peach_jam_cost: 0,
      pink_peach_jam_value: 0.0113,
      pink_peach_jam_wastage: 0,
      pink_peach_jam_cost: 0,
      kiwi_jam_value: 0.0116,
      kiwi_jam_wastage: 0,
      kiwi_jam_cost: 0,
      strawberry_jam_value: 0.0099,
      strawberry_jam_wastage: 0,
      strawberry_jam_cost: 0,
      mango_jam_value: 0.0179,
      mango_jam_wastage: 0,
      mango_jam_cost: 0,
      passion_fruit_jam_value: 0.0174,
      passion_fruit_jam_wastage: 0,
      passion_fruit_jam_cost: 0,
      nata_de_coco_value: 0.0047,
      nata_de_coco_wastage: 0,
      nata_de_coco_cost: 0,
      lemon_value: 0.0053,
      lemon_wastage: 0,
      lemon_cost: 0,
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
