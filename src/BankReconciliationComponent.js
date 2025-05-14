// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import TableBankReconciliation from "./TableBankReconciliation";

function BankReconciliationComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
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
    sales_delivery: 0,
    total_sales: 0,
    cash_box_amount: 0,
    variance: 0,
    visa: 0,
    master: 0,
    my_debit: 0,
    total_terminal: 0,
    comission: 0,
    tng: 0,
    variance_1: 0,
    dr_1: 0,
    dr_2: 0,
    cr: 0,
    total_bank_card: 0,
    variance_2: 0,
    shopee_1: 0,
    grab_1: 0,
    panda_1: 0,
    total_delivery: 0,
    variance_3: 0,
    actual_total: 0,
    total_variance: 0,
  });

  const formMembers = [
    {
      key: "cash",
      label: "Cash",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "touch_n_go",
      label: "Touch N Go",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "duit_now",
      label: "Duit Now",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "voucher",
      label: "Voucher",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "visa_master",
      label: "Bank Card",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "sales_walk_in",
      label: "Net Sales Walk In",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "shopee",
      label: "Shopee",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "grab",
      label: "Grab",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "panda",
      label: "Panda",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "sales_delivery",
      label: "Net Sales Delivery",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "total_sales",
      label: "Total Sales POS",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "visa",
      label: "Visa",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "master",
      label: "Master",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "my_debit",
      label: "Mydebit",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "total_terminal",
      label: "Total Terminal",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "comission",
      label: "Comission",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "cash_box_amount",
      label: "Cash Box Amount",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "variance",
      label: "Variance",
      isReadOnly: true,
      badge: "bg-success",
    },
    {
      key: "tng",
      label: "TNG",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "variance_1",
      label: "Variance",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "dr_1",
      label: "DR/1",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "dr_2",
      label: "DR/2",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "cr",
      label: "CR",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "total_bank_card",
      label: "Total Bank Card",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "variance_2",
      label: "Variance",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "shopee_1",
      label: "Shopee",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "grab_1",
      label: "Grab",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "panda_1",
      label: "Panda",
      isReadOnly: false,
      badge: "bg-danger",
    },
    {
      key: "total_delivery",
      label: "Total Delivery",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "variance_3",
      label: "Variance",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "actual_total",
      label: "Actual Total",
      isReadOnly: true,
      badge: "bg-secondary",
    },
    {
      key: "total_variance",
      label: "Total Variance",
      isReadOnly: true,
      badge: "bg-secondary",
    },
  ];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

  const handleSum = () => {};

  const handleChange = async (e) => {
    const { name, value, type } = e.target;

    if (type !== "file") {
      // Create updated form data
      const updatedFormData = {
        ...formData,
        [name]: value,
      };

      // total_terminal
      if (["visa", "master", "my_debit"].includes(name)) {
        const total_terminal = parseFloat(
          parseFloat(updatedFormData.visa || 0) +
            parseFloat(updatedFormData.master || 0) +
            parseFloat(updatedFormData.my_debit || 0)
        ).toFixed(2);

        updatedFormData.total_terminal = total_terminal;
      }

      // comission
      if (["dr_1", "dr_2", "cr", "visa", "master", "my_debit"].includes(name)) {
        const comission =
          parseFloat(
            parseFloat(updatedFormData.dr_1 || 0) +
              parseFloat(updatedFormData.dr_2 || 0) +
              parseFloat(updatedFormData.cr || 0)
          ).toFixed(2) -
          parseFloat(
            parseFloat(updatedFormData.visa || 0) +
              parseFloat(updatedFormData.master || 0) +
              parseFloat(updatedFormData.my_debit || 0)
          ).toFixed(2);

        updatedFormData.comission = parseFloat(comission).toFixed(2);
      }

      // variance_1
      if (["tng", "touch_n_go", "duit_now"].includes(name)) {
        const variance_1 =
          parseFloat(updatedFormData.tng || 0).toFixed(2) -
          parseFloat(
            parseFloat(updatedFormData.touch_n_go || 0) +
              parseFloat(updatedFormData.duit_now || 0)
          ).toFixed(2);

        updatedFormData.variance_1 = parseFloat(variance_1).toFixed(2);
      }

      // total_bank_card
      if (["dr_1", "dr_2", "cr"].includes(name)) {
        const total_bank_card = parseFloat(
          parseFloat(updatedFormData.dr_1 || 0) +
            parseFloat(updatedFormData.dr_2 || 0) +
            parseFloat(updatedFormData.cr || 0)
        ).toFixed(2);

        updatedFormData.total_bank_card = total_bank_card;
      }

      // variance_2
      if (["dr_1", "dr_2", "cr", "visa", "visa_master"].includes(name)) {
        const variance_2 =
          parseFloat(
            parseFloat(updatedFormData.dr_1 || 0) +
              parseFloat(updatedFormData.dr_2 || 0) +
              parseFloat(updatedFormData.cr || 0)
          ).toFixed(2) -
          parseFloat(updatedFormData.visa_master || 0).toFixed(2);

        updatedFormData.variance_2 = parseFloat(variance_2).toFixed(2);
      }

      // total_delivery
      if (["shopee_1", "grab_1", "panda_1"].includes(name)) {
        const total_delivery = parseFloat(
          parseFloat(updatedFormData.shopee_1 || 0) +
            parseFloat(updatedFormData.grab_1 || 0) +
            parseFloat(updatedFormData.panda_1 || 0)
        ).toFixed(2);

        updatedFormData.total_delivery = total_delivery;
      }

      // variance_3
      if (["shopee_1", "grab_1", "panda_1", "sales_delivery"].includes(name)) {
        const variance_3 =
          parseFloat(
            parseFloat(updatedFormData.shopee_1 || 0) +
              parseFloat(updatedFormData.grab_1 || 0) +
              parseFloat(updatedFormData.panda_1 || 0)
          ).toFixed(2) - parseFloat(updatedFormData.sales_delivery).toFixed(2);

        updatedFormData.variance_3 = parseFloat(variance_3).toFixed(2);
      }

      // actual_total
      if (
        [
          "cash_box_amount",
          "tng",
          "dr_1",
          "dr_2",
          "cr",
          "shopee_1",
          "grab_1",
          "panda_1",
        ].includes(name)
      ) {
        const actual_total = parseFloat(
          parseFloat(updatedFormData.cash_box_amount || 0) +
            parseFloat(updatedFormData.tng || 0) +
            parseFloat(updatedFormData.dr_1 || 0) +
            parseFloat(updatedFormData.dr_2 || 0) +
            parseFloat(updatedFormData.cr || 0) +
            parseFloat(updatedFormData.shopee_1 || 0) +
            parseFloat(updatedFormData.grab_1 || 0) +
            parseFloat(updatedFormData.panda_1 || 0)
        ).toFixed(2);

        updatedFormData.actual_total = actual_total;
      }

      // total_variance
      if (
        [
          "cash_box_amount",
          "tng",
          "dr_1",
          "dr_2",
          "cr",
          "shopee_1",
          "grab_1",
          "panda_1",
          "total_sales",
        ].includes(name)
      ) {
        const total_variance =
          parseFloat(
            parseFloat(updatedFormData.cash_box_amount || 0) +
              parseFloat(updatedFormData.tng || 0) +
              parseFloat(updatedFormData.dr_1 || 0) +
              parseFloat(updatedFormData.dr_2 || 0) +
              parseFloat(updatedFormData.cr || 0) +
              parseFloat(updatedFormData.shopee_1 || 0) +
              parseFloat(updatedFormData.grab_1 || 0) +
              parseFloat(updatedFormData.panda_1 || 0)
          ).toFixed(2) - parseFloat(updatedFormData.total_sales).toFixed(2);

        updatedFormData.total_variance = parseFloat(total_variance).toFixed(2);
      }

      setFormData(updatedFormData);
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
        "http://121.121.232.54:88/aero-foods/bank_reconciliation_sheet.php",
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
      cash: 0,
      touch_n_go: 0,
      duit_now: 0,
      voucher: 0,
      visa_master: 0,
      sales_walk_in: 0,
      shopee: 0,
      grab: 0,
      panda: 0,
      sales_delivery: 0,
      total_sales: 0,
      cash_box_amount: 0,
      variance: 0,
      visa: 0,
      master: 0,
      my_debit: 0,
      total_terminal: 0,
      comission: 0,
      tng: 0,
      variance_1: 0,
      dr_1: 0,
      dr_2: 0,
      cr: 0,
      total_bank_card: 0,
      variance_2: 0,
      shopee_1: 0,
      grab_1: 0,
      panda_1: 0,
      total_delivery: 0,
      variance_3: 0,
      actual_total: 0,
      total_variance: 0,
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
    handleSum();
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
              <h2 className="mb-0">Bank Reconciliation Sheet</h2>
            </div>
          </div>
          <div className="card-body">
            <TableBankReconciliation onRowClick={handleRowClick} />
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

export default BankReconciliationComponent;
