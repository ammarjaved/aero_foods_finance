import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import UserTable from "./UserTable";

function UserFormComponent() {
  const [currentCafe, setCurrentCafe] = useState("mixue");

  const defaultRecord = {
    username: "",
    password: "",
    is_admin: "no",
    db: currentCafe,
  };

  const [formData, setFormData] = useState(defaultRecord);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      alert("Username is required");
      return;
    }

    if (!isEditing && !formData.password.trim()) {
      alert("Password is required for new users");
      return;
    }

    try {
      const submitData = {
        username: formData.username.trim(),
        is_admin: formData.is_admin,
      };

      if (formData.password.trim()) {
        submitData.password = formData.password;
      }

      if (isEditing && formData.id) {
        submitData.id = formData.id;
      }
      submitData.db = formData.db;
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/update-user.php",
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
        const successMessage = isEditing
          ? "User updated successfully"
          : "User added successfully";
        if (result.status == "error") {
          alert(result.error);
        } else {
          alert(result.message || successMessage);
          window.dispatchEvent(new CustomEvent("refreshTable"));

          resetForm();
          setIsFormOpen(false);
        }
      } else {
        throw new Error(result.error || "Failed to save user");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Error saving user. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({ ...defaultRecord });
    setIsEditing(false);
    setShowPassword(false);
  };

  const openNewForm = () => {
    resetForm();
    setFormData({ ...defaultRecord, db: currentCafe });
    setIsFormOpen(true);
  };

  const handleRowClick = async (record, db) => {
    resetForm();
    setFormData({
      id: record.id,
      username: record.username,
      password: record.password,
      is_admin: record.is_admin,
      db: db,
    });
    setCurrentCafe(db);
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
        `Are you sure you want to delete user "${formData.username}"?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/delete_user.php",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: formData.id, db: currentCafe }),
        },
      );

      const result = await response.json();

      if (response.ok) {
        alert("User deleted successfully");

        window.dispatchEvent(
          new CustomEvent("recordDeleted", {
            detail: { id: formData.id },
          }),
        );

        resetForm();
        setIsFormOpen(false);
      } else {
        alert(result.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const isDeleteEnabled = isEditing && formData.id;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">User Management</h4>
              <button className="btn btn-primary" onClick={openNewForm}>
                <i className="fas fa-plus"></i> Add New User
              </button>
            </div>
            <div className="card-body">
              <UserTable
                key={tableRefreshKey}
                onRowClick={handleRowClick}
                onCafeChange={setCurrentCafe}
              />
            </div>
          </div>
        </div>
      </div>

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
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>{isEditing ? "Edit User" : "Add New User"}</h3>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={closeForm}
            >
              &times;
            </button>
          </div>

          <div>
            <div className="mb-3">
              <label className="form-label">
                Username <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter username"
                autoComplete="off"
              />
              <small className="text-muted">
                Username should be unique and easy to remember
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label">
                Cafe <span className="text-danger">*</span>
              </label>
              <select
                name="db"
                value={formData.db}
                onChange={handleChange}
                className="form-select"
                disabled={true}
              >
                <option value="">Select a cafe</option>
                <option value="mixue">Mixue</option>
                <option value="abe">Abe-Yus</option>
                <option value="amz">Amazon</option>
                <option value={"amz-lyp"}>Amazon-LYP</option>
                <option value="ojim">Ojim</option>
              </select>
              <small className="text-muted">
                {isEditing
                  ? "Cafe cannot be changed when editing"
                  : "Select the cafe for this user"}
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label">
                Password {!isEditing && <span className="text-danger">*</span>}
              </label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-control"
                  placeholder={isEditing ? "" : "Enter password"}
                  autoComplete="new-password"
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i
                    className={`fas ${
                      showPassword ? "fa-eye-slash" : "fa-eye"
                    }`}
                  ></i>
                </button>
              </div>
              {isEditing && (
                <small className="text-muted">
                  Leave blank to keep the current password
                </small>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label">
                Admin Status <span className="text-danger">*</span>
              </label>
              <select
                name="is_admin"
                value={formData.is_admin}
                onChange={handleChange}
                className="form-select"
              >
                <option value="no">Regular User</option>
                <option value="yes">Administrator</option>
              </select>
              <small className="text-muted">
                Administrators have full access to all features
              </small>
            </div>

            <div className="alert alert-info">
              <strong>
                <i className="fas fa-info-circle"></i> Account Type:
              </strong>
              <br />
              {formData.is_admin === "yes" ? (
                <>
                  <span className="badge bg-danger me-2">Administrator</span>
                  Full system access with all privileges
                </>
              ) : (
                <>
                  <span className="badge bg-secondary me-2">Regular User</span>
                  Standard user access
                </>
              )}
            </div>

            <div className="mt-4 d-flex justify-content-between">
              {isDeleteEnabled && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deleteRecord}
                >
                  <i className="fas fa-trash"></i> Delete User
                </button>
              )}
              <div className="ms-auto">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                >
                  <i className={`fas ${isEditing ? "fa-save" : "fa-plus"}`}></i>{" "}
                  {isEditing ? "Update User" : "Add User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark"
          style={{ opacity: 0.5, zIndex: 1040 }}
          onClick={closeForm}
        ></div>
      )}

      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
      />
    </div>
  );
}

export default UserFormComponent;
