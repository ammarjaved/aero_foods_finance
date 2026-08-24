import React, { useState, useEffect } from "react";
import { canEdit } from "../../roles";

const TimesheetFormComponent = ({ show, onClose, onSave, editData = null }) => {
  const allowEdit = canEdit();
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeeForms, setEmployeeForms] = useState([]);
  const [globalDate, setGlobalDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (show && !editData && employees.length > 0) {
      const forms = employees.map((emp) => ({
        employee_name: emp.short_name,
        proposed_start_time: "",
        proposed_end_time: "",
        break_hour: "",
        off_day: false,
        next_day: false,
      }));
      setEmployeeForms(forms);
      setGlobalDate(new Date().toISOString().split("T")[0]);
    } else if (editData) {
      const startTime = editData.proposed_start_time
        ? new Date(editData.proposed_start_time).toTimeString().slice(0, 5)
        : "";
      const endTime = editData.proposed_end_time
        ? new Date(editData.proposed_end_time).toTimeString().slice(0, 5)
        : "";

      const startDate = editData.proposed_start_time
        ? new Date(editData.proposed_start_time).toISOString().split("T")[0]
        : "";
      const endDate = editData.proposed_end_time
        ? new Date(editData.proposed_end_time).toISOString().split("T")[0]
        : "";
      const isNextDay = startDate !== endDate && endDate > startDate;

      setEmployeeForms([
        {
          id: editData.id,
          employee_name: editData.employee_name,
          proposed_start_time: startTime,
          proposed_end_time: endTime,
          break_hour: editData.break_hour || "",
          off_day:
            editData.off_day === true ||
            editData.off_day === "t" ||
            editData.off_day === "true",
          next_day: isNextDay,
        },
      ]);
      setGlobalDate(editData.month_date);
    }
  }, [show, editData, employees]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/get_active_employees.php"
      );
      const result = await response.json();

      if (result.status === "success") {
        setEmployees(result.results);
      }
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  const handleInputChange = (index, field, value) => {
    const updatedForms = [...employeeForms];

    if (field === "off_day") {
      updatedForms[index][field] = value === true;
    } else if (field === "next_day") {
      updatedForms[index][field] = value === true;
    } else {
      updatedForms[index][field] = value;

      if (
        (field === "proposed_start_time" || field === "proposed_end_time") &&
        updatedForms[index].proposed_start_time &&
        updatedForms[index].proposed_end_time
      ) {
        const startTime = updatedForms[index].proposed_start_time;
        const endTime = updatedForms[index].proposed_end_time;

        if (endTime < startTime) {
          updatedForms[index].next_day = true;
        } else {
          updatedForms[index].next_day = false;
        }
      }
    }

    setEmployeeForms(updatedForms);
  };

  // Helper function to calculate total hours minus break
  const calculateTotalHours = (startDateTime, endDateTime, breakHours) => {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    // Calculate difference in milliseconds
    const diffMs = end - start;

    // Convert to hours
    const totalHours = diffMs / (1000 * 60 * 60);

    // Subtract break hours
    const workingHours = totalHours - (parseFloat(breakHours) || 0);

    // Return with 2 decimal places, minimum 0
    return Math.max(0, Math.round(workingHours * 100) / 100);
  };

  const handleSubmit = async () => {
    // Validation: Check if any non-off-day form has empty start or end time
    const hasEmptyFields = employeeForms.some((form) => {
      if (!form.off_day) {
        return !form.proposed_start_time || !form.proposed_end_time;
      }
      return false;
    });

    if (hasEmptyFields) {
      alert(
        "Please fill in start and end times for all employees who are not on off day."
      );
      return;
    }

    setSaving(true);

    try {
      const records = employeeForms.map((form) => {
        // For off days, set both start and end time to 00:00:00 on the same date
        if (form.off_day) {
          const offDayDateTime = `${globalDate} 00:00:00`;
          return {
            employee_name: form.employee_name,
            month_date: globalDate,
            total_hours: 0,
            break_hour: 0,
            off_day: true,
            ...(form.id && { id: form.id }),
            proposed_start_time: offDayDateTime,
            proposed_end_time: offDayDateTime,
          };
        }

        // For regular working days
        const startDateTime = `${globalDate} ${form.proposed_start_time}:00`;

        let endDate = globalDate;
        if (form.next_day) {
          const dateObj = new Date(globalDate);
          dateObj.setDate(dateObj.getDate() + 1);
          endDate = dateObj.toISOString().split("T")[0];
        }
        const endDateTime = `${endDate} ${form.proposed_end_time}:00`;

        // Calculate total hours minus break
        const totalHours = calculateTotalHours(
          startDateTime,
          endDateTime,
          form.break_hour
        );

        return {
          employee_name: form.employee_name,
          month_date: globalDate,
          total_hours: totalHours,
          break_hour: parseFloat(form.break_hour) || 0,
          off_day: false,
          ...(form.id && { id: form.id }),
          proposed_start_time: startDateTime,
          proposed_end_time: endDateTime,
        };
      });

      const payload = {
        username: "manager",
        records: records,
      };

      console.log("Sending payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/set_emp_timesheet.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(
          editData
            ? "Timesheet updated successfully!"
            : "Timesheet entries added successfully!"
        );
        if (onSave) {
          onSave();
        }
        onClose();
      } else {
        alert("Error: " + (result.error || "Failed to save data"));
      }
    } catch (err) {
      alert("Error saving timesheet: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1040 }}
      ></div>

      <div
        className="offcanvas offcanvas-end show"
        tabIndex="-1"
        style={{
          visibility: "visible",
          zIndex: 1050,
          width: editData ? "400px" : "650px",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="offcanvas-header border-bottom"
          style={{ flexShrink: 0 }}
        >
          <h5 className="offcanvas-title">
            <i className="bi bi-calendar-check me-2"></i>
            {editData ? "Edit Timesheet Entry" : "Add Timesheet Entries"}
          </h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          ></button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <div
            className="offcanvas-body"
            style={{ overflowY: "auto", flex: 1 }}
          >
            {/* Global Date Field - Appears Once */}
            <div
              className="card mb-3 shadow-sm"
              style={{ borderLeft: "4px solid #198754" }}
            >
              <div className="card-body">
                <h6 className="card-title text-success mb-3">
                  <i className="bi bi-calendar3 me-2"></i>
                  Date for All Entries
                </h6>
                <div className="mb-0">
                  <label className="form-label">
                    Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={globalDate}
                    onChange={(e) => setGlobalDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Employee Forms */}
            {employeeForms.map((form, index) => (
              <div
                key={index}
                className="card mb-3 shadow-sm"
                style={{
                  borderLeft: form.off_day
                    ? "4px solid #dc3545"
                    : form.next_day
                    ? "4px solid #fd7e14"
                    : "4px solid #0d6efd",
                }}
              >
                <div className="card-body">
                  <h6 className="card-title text-primary mb-3">
                    <i className="bi bi-person-circle me-2"></i>
                    {form.employee_name}
                  </h6>

                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`off_day_${index}`}
                        checked={form.off_day}
                        onChange={(e) =>
                          handleInputChange(index, "off_day", e.target.checked)
                        }
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`off_day_${index}`}
                      >
                        <strong className="text-danger">Mark as Off Day</strong>
                      </label>
                    </div>
                  </div>

                  {form.off_day && (
                    <div className="alert alert-info py-2 mb-0" role="alert">
                      <i className="bi bi-info-circle me-2"></i>
                      Off day will be saved with 0 hours (00:00 - 00:00)
                    </div>
                  )}

                  {!form.off_day && (
                    <>
                      <div className="row">
                        <div className="col-6">
                          <label className="form-label">
                            <i className="bi bi-clock me-1"></i>
                            Start Time <span className="text-danger">*</span>
                          </label>
                          <input
                            type="time"
                            className="form-control"
                            value={form.proposed_start_time}
                            onChange={(e) =>
                              handleInputChange(
                                index,
                                "proposed_start_time",
                                e.target.value
                              )
                            }
                            required={!form.off_day}
                          />
                        </div>

                        <div className="col-6">
                          <label className="form-label">
                            <i className="bi bi-clock-fill me-1"></i>
                            End Time <span className="text-danger">*</span>
                          </label>
                          <input
                            type="time"
                            className="form-control"
                            value={form.proposed_end_time}
                            onChange={(e) =>
                              handleInputChange(
                                index,
                                "proposed_end_time",
                                e.target.value
                              )
                            }
                            required={!form.off_day}
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="form-label">
                          <i className="bi bi-cup-hot me-1"></i>
                          Break Hours
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.break_hour}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "break_hour",
                              e.target.value
                            )
                          }
                          placeholder="Enter break hours (e.g., 0.5, 1)"
                          step="0.25"
                          min="0"
                        />
                        <small className="form-text text-muted">
                          Enter break duration in hours (e.g., 0.5 for 30
                          minutes, 1 for 1 hour). Break time will be deducted
                          from total hours.
                        </small>
                      </div>

                      {form.next_day && (
                        <div className="mt-3">
                          <div
                            className="alert alert-warning py-2 mb-0"
                            role="alert"
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>
                                <i className="bi bi-calendar-plus me-2"></i>
                                <strong>Shift ends next day</strong>
                              </span>
                              <div className="form-check form-switch mb-0">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id={`next_day_${index}`}
                                  checked={form.next_day}
                                  onChange={(e) =>
                                    handleInputChange(
                                      index,
                                      "next_day",
                                      e.target.checked
                                    )
                                  }
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor={`next_day_${index}`}
                                >
                                  Next Day
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            className="offcanvas-footer border-top p-3 bg-light"
            style={{ flexShrink: 0 }}
          >
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-fill"
                onClick={onClose}
              >
                <i className="bi bi-x-circle me-2"></i>
                {allowEdit ? "Cancel" : "Close"}
              </button>
              {allowEdit && (
                <button
                  type="button"
                  className="btn btn-primary flex-fill"
                  disabled={saving}
                  onClick={handleSubmit}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      {editData ? "Update" : "Save All"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimesheetFormComponent;
