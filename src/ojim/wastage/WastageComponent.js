// src/FormComponent.js
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import TableWastage from "./TableWastage";

function WastageComponent() {
  const [formData, setFormData] = useState({
    month_date: new Date().toISOString().split("T")[0],
    day: new Date().getDate(),
    utilities: 130,
    rental: 227,

    bubur_value: 0,
    bubur_wastage: 0,
    bubur_cost: 0,

    ayam_cincang_value: 0,
    ayam_cincang_wastage: 0,
    ayam_cincang_cost: 0,

    daging_cincang_value: 0,
    daging_cincang_wastage: 0,
    daging_cincang_cost: 0,

    halia_goreng_value: 0,
    halia_goreng_wastage: 0,
    halia_goreng_cost: 0,

    tempe_goreng_value: 0,
    tempe_goreng_wastage: 0,
    tempe_goreng_cost: 0,

    kentang_goreng_value: 0,
    kentang_goreng_wastage: 0,
    kentang_goreng_cost: 0,

    ikan_bilis_goreng_value: 0,
    ikan_bilis_goreng_wastage: 0,
    ikan_bilis_goreng_cost: 0,

    peria_goreng_value: 0,
    peria_goreng_wastage: 0,
    peria_goreng_cost: 0,

    udang_goreng_value: 0,
    udang_goreng_wastage: 0,
    udang_goreng_cost: 0,

    kacang_goreng_value: 0,
    kacang_goreng_wastage: 0,
    kacang_goreng_cost: 0,

    paru_sira_value: 0,
    paru_sira_wastage: 0,
    paru_sira_cost: 0,

    sotong_lobak_manis_value: 0,
    sotong_lobak_manis_wastage: 0,
    sotong_lobak_manis_cost: 0,

    ikan_masin_lobak_manis_value: 0,
    ikan_masin_lobak_manis_wastage: 0,
    ikan_masin_lobak_manis_cost: 0,

    telur_masin_value: 0,
    telur_masin_wastage: 0,
    telur_masin_cost: 0,

    bawang_goreng_value: 0,
    bawang_goreng_wastage: 0,
    bawang_goreng_cost: 0,

    daun_bawang_value: 0,
    daun_bawang_wastage: 0,
    daun_bawang_cost: 0,

    lada_sulah_value: 0,
    lada_sulah_wastage: 0,
    lada_sulah_cost: 0,

    chilli_flakes_value: 0,
    chilli_flakes_wastage: 0,
    chilli_flakes_cost: 0,

    sambal_bilis_value: 0,
    sambal_bilis_wastage: 0,
    sambal_bilis_cost: 0,

    cili_padi_value: 0,
    cili_padi_wastage: 0,
    cili_padi_cost: 0,

    minyak_bijian_value: 0,
    minyak_bijian_wastage: 0,
    minyak_bijian_cost: 0,

    kicap_cair_value: 0,
    kicap_cair_wastage: 0,
    kicap_cair_cost: 0,

    total_before_discount: 0,
    discount: 0,
    final_total: 0,
  });

  const formMembers = Object.keys(formData)
    .filter((key) => key.endsWith("_wastage") || key.endsWith("_cost"))
    .map((key) => {
      const label = key
        .replaceAll("_", " ")
        .replace("wastage", "wastage (Qty)")
        .replace("cost", "cost (RM)");
      return {
        key,
        label,
        badge: key.includes("cost") ? "bg-secondary" : "bg-danger",
        isReadOnly: key.includes("cost"),
      };
    });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapKey, setMapKey] = useState(Date.now());

  const handleSum = (data) => {
    const total = Object.keys(data)
      .filter((key) => key.endsWith("_cost"))
      .reduce((sum, key) => sum + parseFloat(data[key] || 0), 0);

    const total_before_discount = total.toFixed(2);
    const final_total = (
      parseFloat(total_before_discount) - parseFloat(data.discount || 0)
    ).toFixed(2);
    return { total_before_discount, final_total };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...formData, [name]: value };

    const base = name.replace(/_(wastage|value|cost)$/, "");
    if (name.endsWith("_wastage") || name.endsWith("_value")) {
      const wastage = parseFloat(updated[`${base}_wastage`] || 0);
      const unit = parseFloat(updated[`${base}_value`] || 0);
      updated[`${base}_cost`] = (wastage * unit).toFixed(2);
    }

    const { total_before_discount, final_total } = handleSum(updated);
    updated.total_before_discount = total_before_discount;
    updated.final_total = final_total;

    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { total_before_discount, final_total } = handleSum(formData);
    const data = { ...formData, total_before_discount, final_total };

    try {
      const response = await fetch(
        "http://121.121.232.54:88/ojim-cafe/daily_wastage.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const result = await response.json();
      if (response.ok) {
        alert("Data saved successfully!");
        resetForm();
        setIsFormOpen(false);
        window.location.reload();
      } else {
        alert(result.error || "Failed to save data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.keys(prev).map((k) => [
          k,
          typeof prev[k] === "number" ? 0 : prev[k],
        ])
      ),
      month_date: new Date().toISOString().split("T")[0],
      total_before_discount: 0,
      final_total: 0,
    }));
    setMapKey(Date.now());
    setIsEditing(false);
  };

  const handleRowClick = (record) => {
    setFormData({ ...formData, ...record });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const closeForm = () => setIsFormOpen(false);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div
              className="card-header text-white d-flex justify-content-between align-items-center"
              style={{ backgroundColor: "#e80000" }}
            >
              <h2 className="mb-0">Daily Wastage</h2>
              <button
                className="btn btn-light"
                onClick={() => setIsFormOpen(true)}
              >
                + Add Record
              </button>
            </div>
          </div>
          <div className="card-body">
            <TableWastage onRowClick={handleRowClick} />
          </div>
        </div>
      </div>

      {/* Right-Side Form */}
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
              <div className="col-12 text-center mb-2">
                <div className="badge bg-dark text-light p-2">
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

              <div className="col-12 text-center">
                <div className="badge bg-success p-2">
                  <label className="form-label">Total Wastage (RM)</label>
                  <input
                    type="number"
                    name="total_before_discount"
                    value={formData.total_before_discount}
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>

              {formMembers.map((item, i) => (
                <div className="col-md-6 text-center" key={i}>
                  <div className={`badge ${item.badge} p-2 w-100`}>
                    <label className="form-label">{item.label}</label>
                    <input
                      type="number"
                      name={item.key}
                      value={formData[item.key] ?? 0}
                      onChange={handleChange}
                      className="form-control"
                      readOnly={item.isReadOnly}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <button type="submit" className="btn btn-success">
                {isEditing ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

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
