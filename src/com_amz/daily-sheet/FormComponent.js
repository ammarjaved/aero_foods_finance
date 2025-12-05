// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Table from "./table";

function FormComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
    // month: new Date().getMonth() + 1,
    // year: new Date().getFullYear(),
    day: new Date().getDate(),
    cash: "",
    touch_n_go: "",
    duit_now: "",
    voucher: "",
    visa_master: "",
    sales_walk_in: 0,
    shopee: "",
    grab: "",
    panda: "",
    visa: 0,
    master: 0,
    my_debit: 0,
    sales_delivery: 0,
    total_sales: 0,
    month_date_sales: 0,
    transaction_count: 0,
    avg_transaction_value: 0,
    discount: 0,
    labour_hours_used: 0,
    sales_per_labour_hours: 0,
    image_pos: "",
    prev_day_balance: 0,
    next_day_balance: 0,
    //cash_in_hand: 0,
    actual_bank_amount: 0,
    cash_box_amount: 0,
    variance: 0,
    bank_in_date: new Date().toISOString().split("T")[0],
    recipt_ref_no: "",
    remarks: "",
    image_recipt: "",
  });

  const [imagePreviews, setImagePreviews] = useState({
    image_pos: "",
    image_recipt: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const API_BASE_URL = "http://121.121.232.54:88/amazon-cafe";

  const handleFileChange = (e) => {
    const { name, files } = e.target;

    if (files && files[0]) {
      // For file inputs, we need to handle them differently
      const file = files[0];

      // Create a preview URL for the image
      const previewUrl = URL.createObjectURL(file);

      // Update the image previews state
      setImagePreviews((prevState) => ({
        ...prevState,
        [name]: previewUrl,
      }));

      // Store the file object in formData
      setFormData((prevState) => ({
        ...prevState,
        [name]: file,
      }));
    }
  };

  const handleChange = async (e) => {
    const { name, value, type } = e.target;

    if (type !== "file") {
      // Create updated form data
      const updatedFormData = {
        ...formData,
        [name]: value,
      };

      if (
        ["cash", "touch_n_go", "duit_now", "voucher", "visa_master"].includes(
          name
        )
      ) {
        // Calculate the sum for sales_walk_in
        const sum =
          parseFloat(updatedFormData.cash || 0) +
          parseFloat(updatedFormData.touch_n_go || 0) +
          parseFloat(updatedFormData.duit_now || 0) +
          parseFloat(updatedFormData.voucher || 0) +
          parseFloat(updatedFormData.visa_master || 0);

        // Update sales_walk_in with the calculated sum
        updatedFormData.sales_walk_in = sum;
      }

      if (["shopee", "grab", "panda"].includes(name)) {
        // Calculate the sum for sales_walk_in
        const sum =
          parseFloat(updatedFormData.shopee || 0) +
          parseFloat(updatedFormData.grab || 0) +
          parseFloat(updatedFormData.panda || 0);

        // Update sales_walk_in with the calculated sum
        updatedFormData.sales_delivery = parseFloat(sum).toFixed(2);
      }

      const totalSales =
        parseFloat(updatedFormData.sales_walk_in || 0) +
        parseFloat(updatedFormData.sales_delivery || 0);

      updatedFormData.total_sales = parseFloat(totalSales).toFixed(2);

      if (["actual_bank_amount"].includes(name)) {
        // Calculate the sum for sales_walk_in
        const remaing =
          parseFloat(updatedFormData.cash || 0) +
          parseFloat(updatedFormData.prev_day_balance || 0) -
          updatedFormData.actual_bank_amount;
        // Update sales_walk_in with the calculated sum
        updatedFormData.next_day_balance = remaing;
      }

      if (["cash_box_amount"].includes(name)) {
        // Calculate the sum for sales_walk_in
        const remaing =
          parseFloat(updatedFormData.cash_box_amount || 0) -
          updatedFormData.cash;
        // Update sales_walk_in with the calculated sum
        updatedFormData.variance = parseFloat(remaing).toFixed(2);
      }

      let c_month = 0;
      if (localStorage.getItem("month")) {
        c_month = localStorage.getItem("month");
      } else {
        c_month = parseInt(new Date().getMonth()) + 1;
      }

      const response = await fetch(
        "http://121.121.232.54:88/amazon-cafe/mtd_ts.php?date=" +
          updatedFormData.month_date +
          "&month=" +
          c_month +
          "&id=" +
          updatedFormData.id,
        {
          method: "GET",
        }
      );

      const results = await response.json();

      if (response.ok) {
        updatedFormData.labour_hours_used = results.data.tlh;
        const sum = (
          parseFloat(updatedFormData.total_sales) /
            updatedFormData.labour_hours_used || 0
        ).toFixed(2);
        updatedFormData.sales_per_labour_hours = sum;
        updatedFormData.month_date_sales = parseFloat(
          parseFloat(updatedFormData.total_sales) + parseFloat(results.data.mtd)
        ).toFixed(2);
        updatedFormData.prev_day_balance = parseFloat(results.data.pre).toFixed(
          2
        );
      }

      setFormData(updatedFormData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Create a FormData object for handling file uploads
      const submitData = new FormData();

      // Append all form fields to the FormData
      Object.keys(formData).forEach((key) => {
        if (key === "image_pos" || key === "image_recipt") {
          // Only append file if it exists and is a File object
          if (formData[key] instanceof File) {
            submitData.append(key, formData[key]);
          }
        } else {
          let floatKeys = [
            "cash",
            "touch_n_go",
            "duit_now",
            "voucher",
            "visa_master",
            "sales_walk_in",
            "shopee",
            "grab",
            "panda",
            "visa",
            "master",
            "my_debit",
            "sales_delivery",
            "total_sales",
            "month_date_sales",
            "transaction_count",
            "avg_transaction_value",
            "discount",
            "labour_hours_used",
            "sales_per_labour_hours",
            "prev_day_balance",
            "next_day_balance",
            "actual_bank_amount",
            "cash_box_amount",
            "variance",
          ];
          if (floatKeys.includes(key)) {
            submitData.append(key, parseFloat(formData[key]).toFixed(2));
          } else {
            submitData.append(key, formData[key]);
          }
        }
      });

      // Make the API call with FormData
      const response = await fetch(
        "http://121.121.232.54:88/amazon-cafe/daily_sheet.php",
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
    // Clean up existing preview URLs
    Object.values(imagePreviews).forEach((preview) => {
      if (preview) URL.revokeObjectURL(preview);
    });

    // Reset form data
    setFormData({
      month_date: new Date().toISOString().split("T")[0],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      day: new Date().getDate(),
      cash: 0,
      touch_n_go: 0,
      duit_now: 0,
      voucher: 0,
      visa_master: 0,
      sales_walk_in: 0,
      shopee: 0,
      grab: 0,
      panda: 0,
      visa: 0,
      master: 0,
      my_debit: 0,
      sales_delivery: 0,
      total_sales: 0,
      month_date_sales: 0,
      transaction_count: 0,
      avg_transaction_value: 0,
      labour_hours_used: 0,
      sales_per_labour_hours: 0,
      image_pos: "",
      prev_day_balance: 0,
      next_day_balance: 0,
      //cash_in_hand: 0,
      actual_bank_amount: 0,
      cash_box_amount: 0,
      variance: 0,
      bank_in_date: new Date().toISOString().split("T")[0],
      recipt_ref_no: "",
      remarks: "",
      image_recipt: "",
    });

    // Reset image previews
    setImagePreviews({
      image_pos: "",
      image_recipt: "",
    });

    setMapKey(Date.now());
    setIsEditing(false);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
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

    const response = await fetch(
      "http://121.121.232.54:88/amazon-cafe/mtd_ts.php?date=" +
        record.month_date +
        "&month=" +
        c_month +
        "&id=" +
        record.id,
      {
        method: "GET",
      }
    );

    const results = await response.json();

    if (response.ok) {
      updatedRecord.labour_hours_used = results.data.tlh;
      const sum = (
        parseFloat(updatedRecord.total_sales) /
          updatedRecord.labour_hours_used || 0
      ).toFixed(2);
      updatedRecord.sales_per_labour_hours = sum;
      updatedRecord.month_date_sales = parseFloat(
        parseFloat(updatedRecord.total_sales) + parseFloat(results.data.mtd)
      ).toFixed(2);
      updatedRecord.prev_day_balance = parseFloat(results.data.pre).toFixed(2);
    }

    setFormData(updatedRecord);

    // If there are existing image URLs in the record, set them as previews
    if (record.image_pos) {
      setImagePreviews((prev) => ({
        ...prev,
        image_pos: `${API_BASE_URL}/${record.image_pos}`,
      }));
    }

    if (record.image_recipt) {
      setImagePreviews((prev) => ({
        ...prev,
        image_recipt: `${API_BASE_URL}/${record.image_recipt}`,
      }));
    }

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
        "http://121.121.232.54:88/amazon-cafe/del.php",
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
              className="card-header text-white d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2"
            >
              <h2 className="mb-0 text-center text-sm-start">Daily Sheet</h2>
              <button
                className="btn btn-light btn-sm d-md-none"
                onClick={openNewForm}
              >
                Add New Record
              </button>
            </div>
          </div>
          <div className="card-body p-2 p-md-3">
            <Table onRowClick={handleRowClick} />
          </div>
        </div>
      </div>

      {/* Responsive Sliding Form */}
      <div
        className="position-fixed bg-white shadow-lg"
        style={{
          top: 0,
          right: 0,
          height: "100vh",
          width: isFormOpen ? "100%" : "0",
          maxWidth: isFormOpen
            ? window.innerWidth < 768
              ? "100%"
              : "600px"
            : "0",
          transform: isFormOpen ? "translateX(0)" : "translateX(100%)",
          transition: "all 0.3s ease-in-out",
          zIndex: 1050,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div className="p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-3 sticky-top bg-white py-2">
            <h3 className="h4 h-md-3 mb-0">
              {isEditing ? "Edit Record" : "New Record"}
            </h3>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={closeForm}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Date Section */}
            <div className="mb-4">
              <h5 className="text-primary border-bottom pb-2 mb-3">
                Date Information
              </h5>
              <div className="row g-2 g-md-3">
                <div className="col-12 col-sm-6">
                  <div className="form-group">
                    <label className="form-label fw-bold">Month Date</label>
                    <input
                      type="date"
                      name="month_date"
                      value={formData.month_date}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-12 col-sm-6" style={{ display: "none" }}>
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
              </div>
            </div>

            {/* Walk-in Sales Section */}
            <div className="mb-4">
              <h5 className="text-success border-bottom pb-2 mb-3">
                Walk-in Sales
              </h5>
              <div className="row g-2 g-md-3">
                <div className="col-6 col-md-4">
                  <div className="form-group badge bg-success">
                    <label className="form-label fw-bold">Cash</label>
                    <input
                      type="number"
                      step="0.01"
                      name="cash"
                      value={formData.cash}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="form-group badge bg-success">
                    <label className="form-label fw-bold">Touch N GO</label>
                    <input
                      type="number"
                      step="0.01"
                      name="touch_n_go"
                      value={formData.touch_n_go}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="form-group badge bg-success">
                    <label className="form-label fw-bold">Duit Now</label>
                    <input
                      type="number"
                      step="0.01"
                      name="duit_now"
                      value={formData.duit_now}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="form-group badge bg-success">
                    <label className="form-label fw-bold ">Voucher</label>
                    <input
                      type="number"
                      step="0.01"
                      name="voucher"
                      value={formData.voucher}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="form-group badge bg-success">
                    <label className="form-label fw-bold ">Bank Card</label>
                    <input
                      type="number"
                      step="0.01"
                      name="visa_master"
                      value={formData.visa_master}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="form-group badge bg-success">
                    <label className="form-label fw-bold ">Sales Walk In</label>
                    <input
                      type="number"
                      step="0.01"
                      name="sales_walk_in"
                      value={formData.sales_walk_in}
                      onChange={handleChange}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Sales Section */}
            <div className="mb-4">
              <h5 className="text-info border-bottom pb-2 mb-3">
                Delivery Sales
              </h5>
              <div
                className="row g-2 g-md-3"
                style={{ backgroundColor: "#2E86C1", color: "white" }}
              >
                <div className="col-6 col-md-3">
                  <div className="form-group">
                    <label className="form-label fw-bold">Shopee</label>
                    <input
                      type="number"
                      step="0.01"
                      name="shopee"
                      value={formData.shopee}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="form-group">
                    <label className="form-label fw-bold">Grab</label>
                    <input
                      type="number"
                      step="0.01"
                      name="grab"
                      value={formData.grab}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="form-group">
                    <label className="form-label fw-bold">Panda</label>
                    <input
                      type="number"
                      step="0.01"
                      name="panda"
                      value={formData.panda}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="form-group">
                    <label className="form-label fw-bold">Sales Delivery</label>
                    <input
                      type="number"
                      step="0.01"
                      name="sales_delivery"
                      value={formData.sales_delivery}
                      onChange={handleChange}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h5 className="text-warning border-bottom pb-2 mb-3">
                Payment Methods
              </h5>
              <div
                className="row g-2 g-md-3"
                style={{ backgroundColor: "red", color: "white" }}
              >
                <div className="col-6 col-md-3">
                  <div className="form-group">
                    <label className="form-label fw-bold">Visa</label>
                    <input
                      type="number"
                      step="0.01"
                      name="visa"
                      value={formData.visa}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="form-group">
                    <label className="form-label fw-bold">Master</label>
                    <input
                      type="number"
                      step="0.01"
                      name="master"
                      value={formData.master}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="form-group">
                    <label className="form-label fw-bold">My Debit</label>
                    <input
                      type="number"
                      step="0.01"
                      name="my_debit"
                      value={formData.my_debit}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Sales Section */}
            <div className="mb-4" style={{ backgroundColor: "yellow" }}>
              <h5 className="text-warning border-bottom pb-2 mb-3">
                Sales Summary
              </h5>
              <div className="row g-2 g-md-3">
                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-bold text-danger">
                      Total Sales
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="total_sales"
                      value={formData.total_sales}
                      onChange={handleChange}
                      className="form-control bg-light fw-bold"
                      readOnly
                    />
                  </div>
                </div>

                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-bold text-warning">
                      Month Date Sales
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="month_date_sales"
                      value={formData.month_date_sales}
                      onChange={handleChange}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Details Section */}
            <div className="mb-4">
              <h5 className="text-secondary border-bottom pb-2 mb-3">
                Transaction Details
              </h5>
              <div
                className="row g-2 g-md-3"
                style={{ backgroundColor: "pink" }}
              >
                <div className="col-6 col-md-4">
                  <div className="form-group">
                    <label className="form-label">Transaction Count</label>
                    <input
                      type="number"
                      name="transaction_count"
                      value={formData.transaction_count}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="form-group">
                    <label className="form-label">Avg Transaction Value</label>
                    <input
                      type="number"
                      step="0.01"
                      name="avg_transaction_value"
                      value={formData.avg_transaction_value}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="form-group">
                    <label className="form-label">100% Discount</label>
                    <input
                      type="number"
                      step="0.01"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Labour Information Section */}
            <div className="mb-4">
              <h5
                className="text-purple border-bottom pb-2 mb-3"
                style={{ color: "#8E44AD" }}
              >
                Labour Information
              </h5>
              <div
                className="row g-2 g-md-3"
                style={{ backgroundColor: "purple" }}
              >
                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label">Labour Hours Used</label>
                    <input
                      type="number"
                      step="0.01"
                      name="labour_hours_used"
                      value={formData.labour_hours_used}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label">Sales Per Labour Hours</label>
                    <input
                      type="number"
                      step="0.01"
                      name="sales_per_labour_hours"
                      value={formData.sales_per_labour_hours}
                      onChange={handleChange}
                      className="form-control bg-light"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Management Section */}
            <div className="mb-4">
              <h5 className="text-danger border-bottom pb-2 mb-3">
                Cash Management
              </h5>
              <div
                className="row g-2 g-md-3"
                style={{ backgroundColor: "red" }}
              >
                <div className="col-6 col-md-6" style={{ display: "none" }}>
                  <div className="form-group">
                    <label className="form-label">Prev Day Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      name="prev_day_balance"
                      value={formData.prev_day_balance}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label">Actual Bank Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      name="actual_bank_amount"
                      value={formData.actual_bank_amount}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-6 col-md-6" style={{ display: "none" }}>
                  <div className="form-group">
                    <label className="form-label">Next Day Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      name="next_day_balance"
                      value={formData.next_day_balance}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label">Cash Box Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      name="cash_box_amount"
                      value={formData.cash_box_amount}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-bold">Variance</label>
                    <input
                      type="number"
                      step="0.01"
                      name="variance"
                      value={formData.variance}
                      onChange={handleChange}
                      className="form-control fw-bold"
                      style={{
                        color:
                          parseFloat(formData.variance) > 0 ? "green" : "red",
                        backgroundColor:
                          parseFloat(formData.variance) !== 0 ? "#f8f9fa" : "",
                      }}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Banking Information Section */}
            <div className="mb-4">
              <h5 className="text-dark border-bottom pb-2 mb-3">
                Banking Information
              </h5>
              <div
                className="row g-2 g-md-3"
                style={{ backgroundColor: "#B8860B" }}
              >
                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label">Bank in Date</label>
                    <input
                      type="date"
                      name="bank_in_date"
                      value={formData.bank_in_date}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-6 col-md-6">
                  <div className="form-group">
                    <label className="form-label">Receipt Ref No</label>
                    <input
                      type="text"
                      name="recipt_ref_no"
                      value={formData.recipt_ref_no}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label">Remarks</label>
                    <textarea
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      className="form-control"
                      rows="2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="mb-4">
              <h5 className="text-muted border-bottom pb-2 mb-3">
                Image Uploads
              </h5>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-bold">POS Image</label>
                    <div className="mb-2">
                      <input
                        type="file"
                        name="image_pos"
                        onChange={handleFileChange}
                        className="form-control"
                        accept="image/*"
                      />
                    </div>

                    {imagePreviews.image_pos && (
                      <div className="position-relative mt-2">
                        <img
                          src={imagePreviews.image_pos}
                          alt="POS Preview"
                          className="img-thumbnail w-100"
                          style={{ maxHeight: "200px", objectFit: "cover" }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                          onClick={() => handleRemoveImage("image_pos")}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-bold">Receipt Image</label>
                    <div className="mb-2">
                      <input
                        type="file"
                        name="image_recipt"
                        onChange={handleFileChange}
                        className="form-control"
                        accept="image/*"
                      />
                    </div>

                    {imagePreviews.image_recipt && (
                      <div className="position-relative mt-2">
                        <img
                          src={imagePreviews.image_recipt}
                          alt="Receipt Preview"
                          className="img-thumbnail w-100"
                          style={{ maxHeight: "200px", objectFit: "cover" }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                          onClick={() => handleRemoveImage("image_recipt")}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-4 pt-3 border-top">
              <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-outline-danger order-2 order-sm-1"
                    onClick={deleteRecord}
                  >
                    Delete Record
                  </button>
                )}
                <div className="d-flex gap-2 order-1 order-sm-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary flex-fill flex-sm-grow-0"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-fill flex-sm-grow-0"
                  >
                    {isEditing ? "Update Record" : "Save Record"}
                  </button>
                </div>
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

      {/* Custom CSS for better mobile experience */}
      <style jsx>{`
        @media (max-width: 767.98px) {
          .form-label {
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
          }

          .form-control {
            font-size: 0.875rem;
            padding: 0.5rem 0.75rem;
          }

          .btn {
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
          }

          h5 {
            font-size: 1.1rem;
          }

          .card-header h2 {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 575.98px) {
          .form-label {
            font-size: 0.8rem;
          }

          .form-control {
            font-size: 0.8rem;
            padding: 0.4rem 0.6rem;
          }

          h5 {
            font-size: 1rem;
          }
        }

        /* Ensure form sections are well spaced */
        .form-group {
          margin-bottom: 1rem;
        }

        @media (max-width: 767.98px) {
          .form-group {
            margin-bottom: 0.75rem;
          }
        }

        /* Better image preview on mobile */
        @media (max-width: 767.98px) {
          .img-thumbnail {
            max-height: 150px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default FormComponent;
