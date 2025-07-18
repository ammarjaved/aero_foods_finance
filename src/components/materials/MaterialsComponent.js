// src/FormComponent.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import TableMaterials from "./TableMaterials";

function MaterialsComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
    day: new Date().getDate(),
    month: new Date().getMonth() + 1, // Fixed: getMonth() returns 0-11, need to add 1
    year: new Date().getFullYear(), // Fixed: use getFullYear() instead of getYear()
    code: "",
    name: "",
    description: "",
    category: "",
    unit_price: "",
    packet: "",
    unit: "",
    created_at: "",
    updated_at: "",
    created_by: "",
    updated_by: "",
  });
    const [catG, setCatG] = useState([]);

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
      isReadOnly: false, // Fixed: should be editable for new materials
      badge: "bg-danger",
      type: "dropdown",
      options: ["can", "bottle", "pcs", "roll", "box", "pack", "set", "kg"],
    }, {
      key: "category",
      label: "categories",
      isReadOnly: false, // Fixed: should be editable for new materials
      badge: "bg-warning",
      type: "dropdown",
      options: catG,
    },
  ];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());


  const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

  // Fixed: Removed handleSum function as it's not relevant to materials
  // The sum logic was for a different form (tea costs, etc.)

  const handleChange = async (e) => {
    const { name, value, type } = e.target;

    if (type !== "file") {
      setFormData(prevData => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // Create a FormData object for handling file uploads
    const submitData = new FormData();
    
    // Append all form fields to the FormData
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
        submitData.append(key, formData[key]);
      }
    });
    
    // Add operation type to help backend distinguish between insert/update
    submitData.append('operation', isEditing ? 'update' : 'insert');
    
    // If editing, ensure ID is included
    if (isEditing && formData.id) {
      submitData.append('id', formData.id);
    }
    
    // Debug: Log what we're sending
    console.log('Sending data:', Object.fromEntries(submitData));
    
    // Make the API call with FormData
    const response = await fetch(`${API_BASE_URL}/materials.php`, {
      method: "POST",
      body: submitData,
      // Don't set Content-Type header - let the browser set it for FormData
    });
    
    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || 'Operation failed');
    }
    
    // Create a complete record with the returned ID (for new records)
    const updatedRecord = {
      ...formData,
      id: result.id || formData.id, // Use returned ID for new records, keep existing for updates
    };
    
    // Dispatch appropriate event based on operation type
    const eventName = isEditing ? "recordUpdated" : "newRecordAdded";
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: updatedRecord,
      })
    );
    
    // Reset form and close modal
    resetForm();
    setIsFormOpen(false);
    
    // Show success message
    alert(isEditing ? "Record updated successfully!" : "Record created successfully!");
    
  } catch (error) {
    console.error("Error saving data:", error);
    alert(`Error saving data: ${error.message}. Please try again.`);
  }
};

// Alternative version using REST conventions (if you can modify your backend)
const handleSubmitREST = async (e) => {
  e.preventDefault();
  
  try {
    const submitData = new FormData();
    
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        submitData.append(key, formData[key]);
      }
    });
    
    // Use different HTTP methods and URLs for insert vs update
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing 
      ? `${API_BASE_URL}/materials.php?id=${formData.id}`
      : `${API_BASE_URL}/materials.php`;
    
    const response = await fetch(url, {
      method: method,
      body: submitData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    const updatedRecord = {
      ...formData,
      id: result.id || formData.id,
    };
    
    const eventName = isEditing ? "recordUpdated" : "newRecordAdded";
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: updatedRecord,
      })
    );
    
    resetForm();
    setIsFormOpen(false);
    
  } catch (error) {
    console.error("Error saving data:", error);
    alert(`Error saving data: ${error.message}. Please try again.`);
  }
};

  const resetForm = () => {
    // Reset form data to initial empty state
    setFormData({
      month_date: new Date().toISOString().split("T")[0],
      day: new Date().getDate(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      code: "",
      name: "",
      description: "",
      category: "",
      unit_price: "",
      packet: "",
      unit: "",
      created_at: "",
      updated_at: "",
      created_by: "",
      updated_by: "",
    });

    setMapKey(Date.now());
    setIsEditing(false);
  };

  const handleNewMaterial = () => {
    resetForm(); // Use resetForm to ensure clean state
    setIsEditing(false); // Fixed: set to false for new material
    setIsFormOpen(true);
  };

  const handleRowClick = async (record) => {
    // Reset form first to ensure clean state
    resetForm();
    
    // Set the form data with the record values
    setFormData({
      month_date: record.month_date || new Date().toISOString().split("T")[0],
      day: record.day || new Date().getDate(),
      month: record.month || new Date().getMonth() + 1,
      year: record.year || new Date().getFullYear(),
      code: record.code || "",
      name: record.name || "",
      description: record.description || "",
      category: record.category || "",
      unit_price: record.unit_price || "",
      packet: record.packet || "",
      unit: record.unit || "",
      created_at: record.created_at || "",
      updated_at: record.updated_at || "",
      created_by: record.created_by || "",
      updated_by: record.updated_by || "",
      id: record.id, // Important: preserve the ID for updates
    });

    setMapKey(Date.now());
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm(); // Reset form when closing
  };

  const handledeleteData=async ()=>{
  const isConfirmed = window.confirm(
    `Are you sure you want to delete `
  );
  
  if (!isConfirmed) {
    return; // User cancelled
  }
  
  try {
   
    // Make the DELETE request
    const response = await fetch(`${API_BASE_URL}/materials.php?id=${formData.id}`, {
      method: "DELETE",
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Check if the operation was successful
    if (!result.success) {
      throw new Error(result.error || 'Delete operation failed');
    }
    
 
    
    // Show success message
    alert(`Record Deleted successfully!`);
    window.location.reload();
    
    // Optional: Refresh the data or remove from UI
    // You might want to call a function to refresh your data list here
    
  } catch (error) {
    console.error("Error deleting data:", error);
    alert(`Error deleting ${error.message}. Please try again.`);
  }
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div
              style={{ backgroundColor: "#e80000" }}
              className="card-header text-white d-flex justify-content-between align-items-center"
            >
              <h2 className="mb-0">Materials</h2>
              <button
                className="btn btn-light"
                onClick={handleNewMaterial}
              >
                Add New Material
              </button>
            </div>
            <div className="card-body">
              <TableMaterials onRowClick={handleRowClick} setCatG={setCatG}/>
            </div>
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
            <h3>{isEditing ? "Edit Material" : "New Material"}</h3>
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
                      name={item.key} // Fixed: added name attribute
                      className="form-select"
                      style={{ width: '200px' }} // Custom width of 300px
                      value={formData[item.key]}
                      onChange={handleChange}
                      disabled={item.isReadOnly} // Fixed: use disabled instead of readOnly for select
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
                        // readOnly={item.isReadOnly}
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
          {formData.id &&(
          <button  className="btn btn-danger" onClick={()=>handledeleteData()}>
                Delete
              </button>)}
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