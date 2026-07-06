import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import AllowanceTable from "./AllowanceTable";
import DeductionTable from "./DeductionTable";

const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

const ALLOWANCE_TYPES = [
  "Transportation Allowance",
  "Fixed Allowance",
  "Attendance Allowance",
  "Insurance Allowance",
  "Travelling & Subsistence Allowance",
];

const DEDUCTION_TYPES = [
  "Advance Salary",
  "KWSP",
  "SOCSO",
  "EIS",
  "Loan Repayment",
];

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const CAFE_OPTIONS = [
  { value: "mixue", label: "Mixue" },
  { value: "abe", label: "Abe-Yus" },
  { value: "amz", label: "Amazon" },
  { value: "amz-lyp", label: "Amazon-LYP" },
  { value: "ojim", label: "Ojim" },
  { value: "mixue-sogo", label: "Mixue Sogo" },
  { value: "all", label: "All Cafe" },
];

const ALL_CAFE_KEYS = [
  "mixue", "abe", "amz", "amz-lyp", "ojim", "mixue-sogo",
];

function PayrollManager() {
  const [activeTab, setActiveTab] = useState("allowances");
  const [currentCafe, setCurrentCafe] = useState("mixue");
  const [employees, setEmployees] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const defaultAllowance = {
    employee_name: "",
    allowance_type: ALLOWANCE_TYPES[0],
    amount: "",
    is_recurring: true,
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
    db: currentCafe,
  };

  const defaultDeduction = {
    employee_name: "",
    deduction_type: DEDUCTION_TYPES[0],
    amount: "",
    is_recurring: false,
    is_auto_calculated: false,
    pay_month: "",
    pay_year: new Date().getFullYear().toString(),
    installment_no: 0,
    total_installments: 0,
    db: currentCafe,
  };

  const [allowanceForm, setAllowanceForm] = useState(defaultAllowance);
  const [deductionForm, setDeductionForm] = useState(defaultDeduction);

  // Fetch employees — when "all", fetch from every cafe and tag each with its cafe key
  useEffect(() => {
    if (currentCafe === "all") {
      Promise.all(
        ALL_CAFE_KEYS.map((key) =>
          fetch(`${API_BASE_URL}/get_active_employees.php?db=${key}`)
            .then((res) => res.json())
            .then((data) => ({
              cafeKey: key,
              cafeLabel: CAFE_OPTIONS.find((c) => c.value === key)?.label || key,
              results: data.status === "success" ? data.results || [] : [],
            }))
            .catch(() => ({ cafeKey: key, cafeLabel: key, results: [] })),
        ),
      ).then((allResults) => {
        const merged = [];
        allResults.forEach(({ cafeKey, cafeLabel, results }) => {
          results.forEach((emp) => {
            merged.push({ ...emp, _cafeKey: cafeKey, _cafeLabel: cafeLabel });
          });
        });
        setEmployees(merged);
      });
    } else {
      fetch(`${API_BASE_URL}/get_active_employees.php?db=${currentCafe}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            const tagged = (data.results || []).map((emp) => ({
              ...emp,
              _cafeKey: currentCafe,
              _cafeLabel: CAFE_OPTIONS.find((c) => c.value === currentCafe)?.label || currentCafe,
            }));
            setEmployees(tagged);
          }
        })
        .catch((err) => console.error("Error fetching employees:", err));
    }
  }, [currentCafe]);

  const handleCafeChange = (cafe) => {
    setCurrentCafe(cafe);
    const defaultDb = cafe === "all" ? "" : cafe;
    setAllowanceForm({ ...defaultAllowance, db: defaultDb });
    setDeductionForm({ ...defaultDeduction, db: defaultDb });
  };

  // ===== Allowance handlers =====
  const handleAllowanceChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "employee_name" && currentCafe === "all") {
      const selectedEmp = employees.find((emp) => emp.short_name === value);
      const empDb = selectedEmp ? selectedEmp._cafeKey : "";
      setAllowanceForm({
        ...allowanceForm,
        employee_name: value,
        db: empDb,
      });
      return;
    }

    setAllowanceForm({
      ...allowanceForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAllowanceSubmit = async (e) => {
    e.preventDefault();
    if (!allowanceForm.employee_name.trim()) {
      alert("Employee is required");
      return;
    }
    if (!allowanceForm.db) {
      alert("Please select an employee with a valid cafe");
      return;
    }
    if (!allowanceForm.amount || parseFloat(allowanceForm.amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    try {
      const submitData = {
        ...allowanceForm,
        amount: parseFloat(allowanceForm.amount),
        employee_name: allowanceForm.employee_name.trim(),
        effective_to: allowanceForm.effective_to || null,
        created_by: localStorage.getItem("user") || "admin",
      };
      if (isEditing && allowanceForm.id) {
        submitData.id = allowanceForm.id;
      }

      const response = await fetch(`${API_BASE_URL}/save_allowance.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      if (result.status === "error") {
        alert(result.error);
      } else {
        alert(result.message);
        window.dispatchEvent(new CustomEvent("refreshTable"));
        resetAllowanceForm();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Error saving allowance:", error);
      alert("Error saving allowance. Please try again.");
    }
  };

  const handleAllowanceRowClick = (record) => {
    const rowDb = record._cafeKey || currentCafe;
    setAllowanceForm({
      id: record.id,
      employee_name: record.employee_name,
      allowance_type: record.allowance_type,
      amount: record.amount,
      is_recurring: record.is_recurring === true || record.is_recurring === "t" || record.is_recurring === "true",
      effective_from: record.effective_from ? record.effective_from.split(" ")[0] : new Date().toISOString().split("T")[0],
      effective_to: record.effective_to ? record.effective_to.split(" ")[0] : "",
      db: rowDb,
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const deleteAllowance = async () => {
    if (!window.confirm("Are you sure you want to delete this allowance?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/delete_allowance.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: allowanceForm.id, db: allowanceForm.db }),
      });
      const result = await response.json();
      if (result.status === "success") {
        alert("Allowance deleted successfully");
        window.dispatchEvent(new CustomEvent("refreshTable"));
        resetAllowanceForm();
        setIsFormOpen(false);
      } else {
        alert(result.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const resetAllowanceForm = () => {
    const defaultDb = currentCafe === "all" ? "" : currentCafe;
    setAllowanceForm({ ...defaultAllowance, db: defaultDb });
    setIsEditing(false);
  };

  // ===== Deduction handlers =====
  const handleDeductionChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "employee_name" && currentCafe === "all") {
      const selectedEmp = employees.find((emp) => emp.short_name === value);
      const empDb = selectedEmp ? selectedEmp._cafeKey : "";
      setDeductionForm({
        ...deductionForm,
        employee_name: value,
        db: empDb,
      });
      return;
    }

    setDeductionForm({
      ...deductionForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleDeductionSubmit = async (e) => {
    e.preventDefault();
    if (!deductionForm.employee_name.trim()) {
      alert("Employee is required");
      return;
    }
    if (!deductionForm.db) {
      alert("Please select an employee with a valid cafe");
      return;
    }
    if (!deductionForm.amount || parseFloat(deductionForm.amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    const isStatutory = ["KWSP", "SOCSO", "EIS"].includes(deductionForm.deduction_type);

    try {
      const submitData = {
        ...deductionForm,
        amount: parseFloat(deductionForm.amount),
        employee_name: deductionForm.employee_name.trim(),
        is_recurring: isStatutory ? true : deductionForm.is_recurring,
        pay_month: isStatutory ? null : deductionForm.pay_month,
        pay_year: isStatutory ? null : deductionForm.pay_year,
        created_by: localStorage.getItem("user") || "admin",
      };
      if (isEditing && deductionForm.id) {
        submitData.id = deductionForm.id;
      }

      const response = await fetch(`${API_BASE_URL}/save_deduction.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      if (result.status === "error") {
        alert(result.error);
      } else {
        alert(result.message);
        window.dispatchEvent(new CustomEvent("refreshTable"));
        resetDeductionForm();
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Error saving deduction:", error);
      alert("Error saving deduction. Please try again.");
    }
  };

  const handleDeductionRowClick = (record) => {
    const rowDb = record._cafeKey || currentCafe;
    setDeductionForm({
      id: record.id,
      employee_name: record.employee_name,
      deduction_type: record.deduction_type,
      amount: record.amount,
      is_recurring: record.is_recurring === true || record.is_recurring === "t" || record.is_recurring === "true",
      is_auto_calculated: record.is_auto_calculated === true || record.is_auto_calculated === "t" || record.is_auto_calculated === "true",
      pay_month: record.pay_month || "",
      pay_year: record.pay_year || new Date().getFullYear().toString(),
      installment_no: record.installment_no || 0,
      total_installments: record.total_installments || 0,
      db: rowDb,
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const deleteDeduction = async () => {
    if (!window.confirm("Are you sure you want to delete this deduction?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/delete_deduction.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deductionForm.id, db: deductionForm.db }),
      });
      const result = await response.json();
      if (result.status === "success") {
        alert("Deduction deleted successfully");
        window.dispatchEvent(new CustomEvent("refreshTable"));
        resetDeductionForm();
        setIsFormOpen(false);
      } else {
        alert(result.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const resetDeductionForm = () => {
    const defaultDb = currentCafe === "all" ? "" : currentCafe;
    setDeductionForm({ ...defaultDeduction, db: defaultDb });
    setIsEditing(false);
  };

  const openNewForm = () => {
    if (activeTab === "allowances") {
      resetAllowanceForm();
    } else {
      resetDeductionForm();
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    if (activeTab === "allowances") {
      resetAllowanceForm();
    } else {
      resetDeductionForm();
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setIsFormOpen(false);
    if (tab === "allowances") {
      resetAllowanceForm();
    } else {
      resetDeductionForm();
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const isStatutoryDeduction = ["KWSP", "SOCSO", "EIS"].includes(deductionForm.deduction_type);
  const isAllCafe = currentCafe === "all";

  // Get the cafe label for display in forms
  const formCafeLabel = (() => {
    if (!allowanceForm.db && !deductionForm.db) return "";
    const db = activeTab === "allowances" ? allowanceForm.db : deductionForm.db;
    return CAFE_OPTIONS.find((c) => c.value === db)?.label || db;
  })();

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Payroll Management</h4>
              <button className="btn btn-primary" onClick={openNewForm}>
                <i className="fas fa-plus"></i> Add New {activeTab === "allowances" ? "Allowance" : "Deduction"}
              </button>
            </div>

            <div className="card-body">
              {/* Cafe Selector */}
              <div className="d-flex align-items-center mb-3">
                <label className="me-2 fw-bold">Select Cafe:</label>
                <select
                  className="form-select form-select-sm"
                  value={currentCafe}
                  onChange={(e) => handleCafeChange(e.target.value)}
                  style={{ width: "auto" }}
                >
                  {CAFE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {isAllCafe && (
                  <span className="ms-2 badge bg-info">
                    <i className="fas fa-info-circle"></i> Showing all cafes — data saves to each employee's own DB
                  </span>
                )}
              </div>

              {/* Tabs */}
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "allowances" ? "active" : ""}`}
                    onClick={() => switchTab("allowances")}
                  >
                    <i className="fas fa-plus-circle text-success"></i> Allowances
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "deductions" ? "active" : ""}`}
                    onClick={() => switchTab("deductions")}
                  >
                    <i className="fas fa-minus-circle text-danger"></i> Deductions
                  </button>
                </li>
              </ul>

              {/* Tables */}
              {activeTab === "allowances" ? (
                <AllowanceTable
                  key={tableRefreshKey + currentCafe}
                  cafe={currentCafe}
                  onRowClick={handleAllowanceRowClick}
                />
              ) : (
                <DeductionTable
                  key={tableRefreshKey + currentCafe}
                  cafe={currentCafe}
                  onRowClick={handleDeductionRowClick}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Form Drawer */}
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
            <h3>
              {isEditing ? "Edit" : "Add New"}{" "}
              {activeTab === "allowances" ? "Allowance" : "Deduction"}
            </h3>
            <button className="btn btn-sm btn-outline-secondary" onClick={closeForm}>
              &times;
            </button>
          </div>

          {/* Show which cafe the data will save to */}
          {isAllCafe && formCafeLabel && (
            <div className="alert alert-secondary py-2">
              <i className="fas fa-database me-1"></i>
              <strong>Saves to:</strong> {formCafeLabel}
            </div>
          )}

          {/* ===== ALLOWANCE FORM ===== */}
          {activeTab === "allowances" && (
            <div>
              <div className="mb-3">
                <label className="form-label">
                  Employee <span className="text-danger">*</span>
                </label>
                <select
                  name="employee_name"
                  value={allowanceForm.employee_name}
                  onChange={handleAllowanceChange}
                  className="form-select"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={`${emp._cafeKey}-${emp.short_name}`} value={emp.short_name}>
                      {emp.short_name}
                      {isAllCafe ? ` (${emp._cafeLabel})` : ""}
                      {emp.employment_type === "Monthly" && emp.basic_salary
                        ? ` — RM ${formatMoney(emp.basic_salary)}`
                        : " — Hourly"}
                    </option>
                  ))}
                </select>
                {isAllCafe && allowanceForm.employee_name && allowanceForm.db && (
                  <small className="text-muted">
                    <i className="fas fa-arrow-right"></i> Data will be saved to{" "}
                    <strong>
                      {CAFE_OPTIONS.find((c) => c.value === allowanceForm.db)?.label || allowanceForm.db}
                    </strong>
                  </small>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Allowance Type <span className="text-danger">*</span>
                </label>
                <select
                  name="allowance_type"
                  value={allowanceForm.allowance_type}
                  onChange={handleAllowanceChange}
                  className="form-select"
                >
                  {ALLOWANCE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Amount (RM) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">RM</span>
                  <input
                    type="number"
                    name="amount"
                    value={allowanceForm.amount}
                    onChange={handleAllowanceChange}
                    className="form-control"
                    placeholder="e.g. 200.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={allowanceForm.is_recurring}
                    onChange={handleAllowanceChange}
                    className="form-check-input"
                    id="allowanceRecurring"
                  />
                  <label className="form-check-label" htmlFor="allowanceRecurring">
                    Recurring (applies every month)
                  </label>
                </div>
                <small className="text-muted">
                  Uncheck if this is a one-time allowance
                </small>
              </div>

              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label">Effective From</label>
                  <input
                    type="date"
                    name="effective_from"
                    value={allowanceForm.effective_from}
                    onChange={handleAllowanceChange}
                    className="form-control"
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Effective To</label>
                  <input
                    type="date"
                    name="effective_to"
                    value={allowanceForm.effective_to}
                    onChange={handleAllowanceChange}
                    className="form-control"
                  />
                  <small className="text-muted">Leave empty = active indefinitely</small>
                </div>
              </div>

              <div className="alert alert-info">
                <strong><i className="fas fa-info-circle"></i> Summary:</strong>
                <br />
                <span className="badge bg-success me-1">
                  {allowanceForm.allowance_type}
                </span>
                {allowanceForm.is_recurring && (
                  <span className="badge bg-primary me-1">Recurring</span>
                )}
                {allowanceForm.amount && (
                  <span className="badge bg-warning text-dark me-1">
                    RM {formatMoney(parseFloat(allowanceForm.amount))}
                  </span>
                )}
              </div>

              <div className="mt-4 d-flex justify-content-between">
                {isEditing && allowanceForm.id && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={deleteAllowance}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                )}
                <div className="ms-auto">
                  <button type="button" className="btn btn-secondary me-2" onClick={closeForm}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleAllowanceSubmit}>
                    <i className={`fas ${isEditing ? "fa-save" : "fa-plus"}`}></i>{" "}
                    {isEditing ? "Update" : "Add"} Allowance
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== DEDUCTION FORM ===== */}
          {activeTab === "deductions" && (
            <div>
              <div className="mb-3">
                <label className="form-label">
                  Employee <span className="text-danger">*</span>
                </label>
                <select
                  name="employee_name"
                  value={deductionForm.employee_name}
                  onChange={handleDeductionChange}
                  className="form-select"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={`${emp._cafeKey}-${emp.short_name}`} value={emp.short_name}>
                      {emp.short_name}
                      {isAllCafe ? ` (${emp._cafeLabel})` : ""}
                      {emp.employment_type === "Monthly" && emp.basic_salary
                        ? ` — RM ${formatMoney(emp.basic_salary)}`
                        : " — Hourly"}
                    </option>
                  ))}
                </select>
                {isAllCafe && deductionForm.employee_name && deductionForm.db && (
                  <small className="text-muted">
                    <i className="fas fa-arrow-right"></i> Data will be saved to{" "}
                    <strong>
                      {CAFE_OPTIONS.find((c) => c.value === deductionForm.db)?.label || deductionForm.db}
                    </strong>
                  </small>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Deduction Type <span className="text-danger">*</span>
                </label>
                <select
                  name="deduction_type"
                  value={deductionForm.deduction_type}
                  onChange={handleDeductionChange}
                  className="form-select"
                >
                  {DEDUCTION_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {isStatutoryDeduction && (
                  <small className="text-muted">
                    <i className="fas fa-info-circle"></i> Statutory deduction - automatically recurring every month
                  </small>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Amount (RM) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">RM</span>
                  <input
                    type="number"
                    name="amount"
                    value={deductionForm.amount}
                    onChange={handleDeductionChange}
                    className="form-control"
                    placeholder="e.g. 220.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {!isStatutoryDeduction && (
                <>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        name="is_recurring"
                        checked={deductionForm.is_recurring}
                        onChange={handleDeductionChange}
                        className="form-check-input"
                        id="deductionRecurring"
                      />
                      <label className="form-check-label" htmlFor="deductionRecurring">
                        Recurring (applies every month)
                      </label>
                    </div>
                    <small className="text-muted">
                      Check for ongoing deductions like loans. Uncheck for one-time deductions like Advance Salary.
                    </small>
                  </div>

                  {!deductionForm.is_recurring && (
                    <div className="row mb-3">
                      <div className="col-6">
                        <label className="form-label">Pay Month <span className="text-danger">*</span></label>
                        <select
                          name="pay_month"
                          value={deductionForm.pay_month}
                          onChange={handleDeductionChange}
                          className="form-select"
                        >
                          <option value="">Select month</option>
                          {MONTHS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label">Pay Year <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          name="pay_year"
                          value={deductionForm.pay_year}
                          onChange={handleDeductionChange}
                          className="form-control"
                          placeholder="2026"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Loan tracking */}
              {deductionForm.deduction_type === "Loan Repayment" && deductionForm.is_recurring && (
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label">Installment No.</label>
                    <input
                      type="number"
                      name="installment_no"
                      value={deductionForm.installment_no}
                      onChange={handleDeductionChange}
                      className="form-control"
                      min="0"
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Total Installments</label>
                    <input
                      type="number"
                      name="total_installments"
                      value={deductionForm.total_installments}
                      onChange={handleDeductionChange}
                      className="form-control"
                      min="0"
                    />
                    <small className="text-muted">
                      Deduction auto-stops when installment_no reaches total
                    </small>
                  </div>
                </div>
              )}

              <div className="alert alert-info">
                <strong><i className="fas fa-info-circle"></i> Summary:</strong>
                <br />
                <span className="badge bg-danger me-1">
                  {deductionForm.deduction_type}
                </span>
                {(isStatutoryDeduction || deductionForm.is_recurring) && (
                  <span className="badge bg-primary me-1">Recurring</span>
                )}
                {deductionForm.amount && (
                  <span className="badge bg-warning text-dark me-1">
                    RM {formatMoney(parseFloat(deductionForm.amount))}
                  </span>
                )}
                {deductionForm.total_installments > 0 && (
                  <span className="badge bg-info text-dark me-1">
                    {deductionForm.installment_no}/{deductionForm.total_installments} installments
                  </span>
                )}
              </div>

              <div className="mt-4 d-flex justify-content-between">
                {isEditing && deductionForm.id && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={deleteDeduction}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                )}
                <div className="ms-auto">
                  <button type="button" className="btn btn-secondary me-2" onClick={closeForm}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleDeductionSubmit}>
                    <i className={`fas ${isEditing ? "fa-save" : "fa-plus"}`}></i>{" "}
                    {isEditing ? "Update" : "Add"} Deduction
                  </button>
                </div>
              </div>
            </div>
          )}
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

export default PayrollManager;
