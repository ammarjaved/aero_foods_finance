// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import ExpenseTable from "./ExpenseTable";

function ExpenseFormComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
      day: new Date().getDate(),
      vendor:'',
      amount:'',
      remarks:''
  });


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());




  const handleChange = async (e) => {
    const { name, value, type } = e.target;


      // Create updated form data
      const updatedFormData = {
        ...formData,
        [name]: value,
      };

     

      setFormData(updatedFormData);
    
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    // Create a regular object instead of FormData
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
      username: localStorage.getItem('user'),
      records: [submitData] // PHP expects an array of records
    };

    // Make the API call
    const response = await fetch(
      "http://121.121.232.54:88/amazon-cafe/daily_expenditure.php",
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
      // Get the first result since we sent one record
      const savedRecord = result.results[0];
      
      // Create a complete record with the returned data
      const updatedRecord = {
        ...formData,
        id: savedRecord.id,
      };

      // Show success message
      alert(result.message || (isEditing ? 'Record updated successfully' : 'Record added successfully'));

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
  

  const resetForm = () => {
    // Clean up existing preview URLs
   

    // Reset form data
    setFormData({
      month_date: new Date().toISOString().split("T")[0],
      day: new Date().getDate(),
      vendor:'',
      amount:'',
      remarks:''
    });

  
    setMapKey(Date.now());
    setIsEditing(false);
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // const handleMonthTodate=async (date)=>{

  // }

  const handleRowClick = async (record) => {
    // First completely reset the form to clear any previous values
    resetForm();

    // Create a new object with all form fields explicitly set
    const updatedRecord = {
      ...formData, // Start with the default empty values
      ...record, // Override with record values
    };

   
    setFormData(updatedRecord);

    // If there are existing image URLs in the record, set them as previews
    

 

    setMapKey(Date.now());
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm(); // Reset form when closing
  };

  const deleteRecord = async () => {
    if (!window.confirm(`Are you sure you want to delete the expense for "${formData.vendor}" with amount ${formData.amount}?`)) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/amazon-cafe/delete_daily_expenditure.php",
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


  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div
              style={{ backgroundColor: "#e80000" }}
              className="card-header text-white d-flex justify-content-between align-items-center"
            >
              <h2 className="mb-0">Daily Sheet</h2>
              <button 
                className="btn btn-light" 
                onClick={openNewForm}
              >
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
          width: "500px",
          transform: isFormOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
          zIndex: 1050,
          overflowY: "auto",
        }}
      >
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>{isEditing ? "Edit Record" : "Add New Record"}</h3>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={closeForm}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-2">
              <div className="col-md-6" >
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

              <div className="col-md-6" >
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

              <div className="col-md-6" >
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

            <div className="mt-4 d-flex justify-content-between">
              {isEditing && (
                <button type="button" className="btn btn-danger" onClick={deleteRecord}>
                  Delete
                </button>
              )}
              <div className="ms-auto">
                <button type="button" className="btn btn-secondary me-2" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? "Update" : "Save"}
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