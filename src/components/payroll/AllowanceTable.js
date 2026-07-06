import React, { useEffect, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

const ALL_CAFE_KEYS = [
  { key: "mixue", label: "Mixue" },
  { key: "abe", label: "Abe-Yus" },
  { key: "amz", label: "Amazon" },
  { key: "amz-lyp", label: "Amazon-LYP" },
  { key: "ojim", label: "Ojim" },
  { key: "mixue-sogo", label: "Mixue Sogo" },
];

function AllowanceTable({ cafe, onRowClick }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCafe, setFilterCafe] = useState("");

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return dateString.split(" ")[0];
  };

  const fetchData = useCallback(() => {
    setLoading(true);

    const mapRecord = (record, cafeKey, cafeLabel) => ({
      id: record.id,
      employee_name: record.employee_name,
      allowance_type: record.allowance_type,
      amount: parseFloat(record.amount) || 0,
      is_recurring:
        record.is_recurring === "t" ||
        record.is_recurring === true ||
        record.is_recurring === "true",
      effective_from: record.effective_from,
      effective_to: record.effective_to,
      employment_type: record.employment_type || "",
      basic_salary: record.basic_salary || "",
      _cafeKey: cafeKey,
      _cafeLabel: cafeLabel,
    });

    if (cafe === "all") {
      Promise.all(
        ALL_CAFE_KEYS.map(({ key, label }) =>
          fetch(`${API_BASE_URL}/get_allowances.php?db=${key}`)
            .then((response) => response.json())
            .then((fetchedData) => {
              if (fetchedData.status === "success") {
                return (fetchedData.results || []).map((r) => mapRecord(r, key, label));
              }
              return [];
            })
            .catch(() => []),
        ),
      ).then((allResults) => {
        const merged = allResults.flat();
        merged.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
        setData(merged);
        setLoading(false);
      });
    } else {
      const cafeLabel =
        ALL_CAFE_KEYS.find((c) => c.key === cafe)?.label || cafe;
      fetch(`${API_BASE_URL}/get_allowances.php?db=${cafe}`)
        .then((response) => response.json())
        .then((fetchedData) => {
          if (fetchedData.status === "success") {
            const cleaned = (fetchedData.results || []).map((r) =>
              mapRecord(r, cafe, cafeLabel),
            );
            setData(cleaned);
          } else {
            setData([]);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching allowances:", error);
          setLoading(false);
          setData([]);
        });
    }
  }, [cafe]);

  useEffect(() => {
    fetchData();
    const handleRefresh = () => fetchData();
    window.addEventListener("refreshTable", handleRefresh);
    return () => window.removeEventListener("refreshTable", handleRefresh);
  }, [fetchData]);

  const filteredData = data.filter((record) => {
    if (
      filterEmployee &&
      !record.employee_name.toLowerCase().includes(filterEmployee.toLowerCase())
    )
      return false;
    if (
      filterType &&
      !record.allowance_type.toLowerCase().includes(filterType.toLowerCase())
    )
      return false;
    if (
      filterCafe &&
      !record._cafeLabel.toLowerCase().includes(filterCafe.toLowerCase())
    )
      return false;
    return true;
  });

  const totalAmount = filteredData.reduce((sum, r) => sum + r.amount, 0);
  const isAllCafe = cafe === "all";

  const allowanceColors = {
    "Transportation Allowance": "primary",
    "Fixed Allowance": "success",
    "Attendance Allowance": "info",
    "Insurance Allowance": "warning",
    "Travelling & Subsistence Allowance": "secondary",
  };

  const colCount = isAllCafe ? 9 : 8;

  return (
    <div>
      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="d-flex gap-3 mb-3">
            <div className="flex-grow-1">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Filter by employee name..."
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
              />
            </div>
            <div className="flex-grow-1">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Filter by type..."
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              />
            </div>
            {isAllCafe && (
              <div className="flex-grow-1">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Filter by cafe..."
                  value={filterCafe}
                  onChange={(e) => setFilterCafe(e.target.value)}
                />
              </div>
            )}
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchData}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  {isAllCafe && <th>Cafe</th>}
                  <th>Allowance Type</th>
                  <th className="text-end">Amount</th>
                  <th>Recurring</th>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  <th>Emp. Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <tr
                      key={`${record._cafeKey}-${record.id}`}
                      onClick={() => onRowClick && onRowClick(record)}
                      style={{ cursor: onRowClick ? "pointer" : "default" }}
                    >
                      <td>{record.id}</td>
                      <td className="fw-bold">{record.employee_name}</td>
                      {isAllCafe && (
                        <td>
                          <span className="badge bg-secondary">
                            {record._cafeLabel}
                          </span>
                        </td>
                      )}
                      <td>
                        <span
                          className={`badge bg-${allowanceColors[record.allowance_type] || "secondary"}`}
                        >
                          {record.allowance_type}
                        </span>
                      </td>
                      <td className="text-end fw-bold text-success">
                        RM {formatMoney(record.amount)}
                      </td>
                      <td>
                        {record.is_recurring ? (
                          <span className="badge bg-primary">
                            <i className="fas fa-sync"></i> Yes
                          </span>
                        ) : (
                          <span className="badge bg-secondary">One-time</span>
                        )}
                      </td>
                      <td>{formatDate(record.effective_from)}</td>
                      <td>
                        {record.effective_to ? (
                          formatDate(record.effective_to)
                        ) : (
                          <span className="text-muted">Active</span>
                        )}
                      </td>
                      <td>
                        {record.employment_type === "Monthly" ? (
                          <span className="badge bg-primary">Monthly</span>
                        ) : record.employment_type === "Hours" ? (
                          <span className="badge bg-info text-dark">Hourly</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={colCount} className="text-center text-muted">
                      No allowances found
                      <br />
                      <small>Click "Add New Allowance" to get started</small>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot>
                  <tr className="table-light fw-bold">
                    <td colSpan={isAllCafe ? 4 : 3} className="text-end">
                      Total ({filteredData.length} records):
                    </td>
                    <td className="text-end text-success">
                      RM {formatMoney(totalAmount)}
                    </td>
                    <td colSpan={isAllCafe ? 4 : 4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AllowanceTable;
