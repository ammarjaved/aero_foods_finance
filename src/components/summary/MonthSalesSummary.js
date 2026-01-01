import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

function MonthSalesSummary() {
  const [selectedCafe, setSelectedCafe] = useState("aero_foods_finance");
  const [selectedMonth, setSelectedMonth] = useState("11");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cafes = [
    { value: "ojim_finance", label: "Ojim Cafe" },
    { value: "aero_foods_finance", label: "Mixue" },
    { value: "amazon_cafe_finance", label: "D' Amazon Cafe" },
    { value: "abe_yus_finance", label: "Abe Yus" },
  ];

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://121.121.232.54:88/aero-foods/mss.php?month=${selectedMonth}&db=${selectedCafe}`
      );
      const result = await response.json();
      setData(result[0]);
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCafe, selectedMonth]);

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toFixed(2);
  };

  const calculateDiff = (total, recon) => {
    const diff = parseFloat(total || 0) - parseFloat(recon || 0);
    return diff.toFixed(2);
  };

  const calculatePercentage = (total, recon) => {
    const diff = parseFloat(recon || 0) - parseFloat(total || 0);
    const percentage = total ? (diff / parseFloat(total)) * 100 : 0;
    return percentage.toFixed(2);
  };

  if (loading && !data) {
    return (
      <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <RefreshCw
            className="mb-2"
            size={32}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <p className="text-muted">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid bg-light py-4">
      <div className="container">
        <h1 className="text-center fw-bold mb-4">Monthly Sales Summary</h1>

        {/* Cafe Selection */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title fw-semibold mb-3">Select Cafe</h5>
            <div className="row g-3">
              {cafes.map((cafe) => (
                <div className="col-md-3 col-sm-6" key={cafe.value}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="cafe"
                      id={cafe.value}
                      value={cafe.value}
                      checked={selectedCafe === cafe.value}
                      onChange={(e) => setSelectedCafe(e.target.value)}
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor={cafe.value}
                    >
                      {cafe.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Month Selection */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title fw-semibold mb-3">Select Month</h5>
            <select
              className="form-select w-100"
              style={{ maxWidth: "300px" }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            className="alert alert-danger border-start border-5 border-danger mb-4"
            role="alert"
          >
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Overall Summary */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-bold mb-4">Overall Summary</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded d-flex justify-content-between">
                      <span className="fw-medium">Total Sales</span>
                      <span className="fw-semibold">
                        RM {formatCurrency(data.total_sales)}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded d-flex justify-content-between">
                      <span className="fw-medium">Total Recon</span>
                      <span className="fw-semibold">
                        RM {formatCurrency(data.total_recon)}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-primary bg-opacity-10 rounded d-flex justify-content-between">
                      <span className="fw-medium">Diff Sales vs Recon</span>
                      <span className="fw-semibold text-primary">
                        {calculateDiff(data.total_sales, data.total_recon)}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-primary bg-opacity-10 rounded d-flex justify-content-between">
                      <span className="fw-medium">
                        Sales vs Recon Diff Percentage
                      </span>
                      <span className="fw-semibold text-primary">
                        {calculatePercentage(
                          data.total_sales,
                          data.total_recon
                        )}
                        %
                      </span>
                    </div>
                  </div>
                  {/* <div className="col-md-6">
                    <div className="p-3 bg-primary bg-opacity-10 rounded d-flex justify-content-between">
                      <span className="fw-medium">Cash Box Percentage</span>
                      <span className="fw-semibold text-primary">
                        {calculatePercentage(
                          data.total_sales,
                          data.total_recon
                        )}
                        %
                      </span>
                    </div>
                  </div> */}
                  <div className="col-md-6">
                    <div className="p-3 bg-success bg-opacity-10 rounded d-flex justify-content-between">
                      <span className="fw-medium">Total Cash Box</span>
                      <span className="fw-semibold text-success">
                        RM {formatCurrency(data.cash_box_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-primary bg-opacity-10 rounded d-flex justify-content-between">
                      <span className="fw-medium">Cash Box Percentage</span>
                      <span className="fw-semibold text-primary">
                        {(
                          (data.cash_box_amount / data.total_recon) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Summary */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-bold mb-4">Delivery Summary</h5>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Platform</th>
                        <th className="text-end">Total (RM)</th>
                        <th className="text-end">Recon (RM)</th>
                        <th className="text-end">Diff (RM)</th>
                        <th className="text-end">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-medium">Shopee</td>
                        <td className="text-end">
                          {formatCurrency(data.total_shopee)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(data.recon_shopee)}
                        </td>
                        <td className="text-end">
                          {calculateDiff(data.recon_shopee, data.total_shopee)}
                        </td>
                        <td className="text-end">
                          {calculatePercentage(
                            data.total_shopee,
                            data.recon_shopee
                          )}
                          %
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium">Grab</td>
                        <td className="text-end">
                          {formatCurrency(data.total_grab)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(data.recon_grab)}
                        </td>
                        <td className="text-end">
                          {calculateDiff(data.recon_grab, data.total_grab)}
                        </td>
                        <td className="text-end">
                          {calculatePercentage(
                            data.total_grab,
                            data.recon_grab
                          )}
                          %
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium">Panda</td>
                        <td className="text-end">
                          {formatCurrency(data.total_panda)}
                        </td>
                        <td className="text-end">
                          {formatCurrency(data.recon_panda)}
                        </td>
                        <td className="text-end">
                          {calculateDiff(data.recon_panda, data.total_panda)}
                        </td>
                        <td className="text-end">
                          {calculatePercentage(
                            data.total_panda,
                            data.recon_panda
                          )}
                          %
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-medium">Total Delivery</td>
                        <td className="text-end">
                          {formatCurrency(
                            Number(data.total_panda) +
                              Number(data.total_grab) +
                              Number(data.total_shopee)
                          )}
                        </td>
                        <td className="text-end">
                          {formatCurrency(
                            Number(data.recon_panda) +
                              Number(data.recon_grab) +
                              Number(data.recon_shopee)
                          )}
                        </td>
                        <td className="text-end">
                          {Math.round(
                            Number(data.recon_panda) +
                              Number(data.recon_grab) +
                              Number(data.recon_shopee) -
                              (Number(data.total_panda) +
                                Number(data.total_grab) +
                                Number(data.total_shopee))
                          )}
                        </td>
                        <td className="text-end">
                          {(
                            ((Number(data.recon_panda) +
                              Number(data.recon_grab) +
                              Number(data.recon_shopee) -
                              (Number(data.total_panda) +
                                Number(data.total_grab) +
                                Number(data.total_shopee))) /
                              (Number(data.total_panda) +
                                Number(data.total_grab) +
                                Number(data.total_shopee))) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Cash Summary */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-bold mb-4">Cash Summary</h5>
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded d-flex justify-content-between">
                      <span className="fw-medium">Total Cash</span>
                      <span className="fw-semibold">
                        RM {formatCurrency(data.total_cash_box_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded d-flex justify-content-between">
                      <span className="fw-medium">Cash Box Amount</span>
                      <span className="fw-semibold">
                        RM {formatCurrency(data.cash_box_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded d-flex justify-content-between">
                      <span className="fw-medium">Diff</span>
                      <span className="fw-semibold">
                        {calculateDiff(
                          data.cash_box_amount,
                          data.total_cash_box_amount
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="p-3 bg-light rounded d-flex justify-content-between">
                      <span className="fw-medium">%</span>
                      <span className="fw-semibold">
                        {(
                          (calculateDiff(
                            data.cash_box_amount,
                            data.total_cash_box_amount
                          ) /
                            data.cash_box_amount) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary TNG/Duit Now */}
            <div class="container mt-4">
              <h4 class="mb-3">Summary TNG / Duit Now</h4>

              <div class="table-responsive">
                <table class="table table-bordered table-hover">
                  <thead class="table-light">
                    <tr>
                      <th scope="col">Description</th>
                      <th scope="col" class="text-end">
                        Amount (RM)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total TNG</td>
                      <td class="text-end">{formatCurrency(data.total_tng)}</td>
                    </tr>
                    <tr>
                      <td>Duit Now</td>
                      <td class="text-end">{formatCurrency(data.duit_now)}</td>
                    </tr>
                    <tr class="table-primary">
                      <td>
                        <strong>Total TNG + DuitNow</strong>
                      </td>
                      <td class="text-end">
                        <strong>
                          {formatCurrency(
                            Number(data.duit_now) + Number(data.total_tng)
                          )}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Recon TNG</td>
                      <td class="text-end">{formatCurrency(data.recon_tng)}</td>
                    </tr>
                    <tr class="table-warning">
                      <td>
                        <strong>Difference</strong>
                      </td>
                      <td class="text-end">
                        <strong>
                          {(
                            Number(data.recon_tng) -
                            (Number(data.total_tng) + Number(data.duit_now))
                          ).toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                    <tr class="table-info">
                      <td>
                        <strong>Variance %</strong>
                      </td>
                      <td class="text-end">
                        <strong>
                          {(
                            ((Number(data.recon_tng) -
                              (Number(data.total_tng) +
                                Number(data.duit_now))) /
                              (Number(data.duit_now) +
                                Number(data.total_tng))) *
                            100
                          ).toFixed(2)}
                          %
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-bold mb-4">
                  Summary Terminal POS
                </h5>

                <div className="table-responsive">
                  <table className="table table-bordered">
                    {/* <thead>
                      <tr>
                        <th>Description</th>
                        <th className="text-end">Amount (RM)</th>
                        <th>Recon Type</th>
                        <th className="text-end">Recon Amount (RM)</th>
                        <th></th>
                        <th className="text-end">Diff (RM)</th>
                        <th className="text-end">Variance %</th>
                      </tr>
                    </thead> */}
                    <tbody>
                      <tr>
                        <td rowSpan="4" className="align-middle fw-semibold">
                          Bank Card
                        </td>
                        <td rowSpan="4" className="text-end align-middle">
                          {formatCurrency(data.total_bank_card)}
                        </td>
                        <td>Recon DR1</td>
                        <td className="text-end">{formatCurrency(data.dr1)}</td>
                        <td rowSpan="4"></td>
                        <td
                          rowSpan="4"
                          className="text-end align-middle fw-semibold"
                        >
                          {formatCurrency(
                            Number(data.dr1) +
                              Number(data.dr2) +
                              Number(data.cr) -
                              Number(data.total_bank_card)
                          )}
                        </td>
                        <td
                          rowSpan="4"
                          className="text-end align-middle fw-semibold"
                        >
                          {(
                            ((Number(data.dr1) +
                              Number(data.dr2) +
                              Number(data.cr) -
                              Number(data.total_bank_card)) /
                              Number(data.total_bank_card)) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                      </tr>
                      <tr>
                        <td>Recon DR 2</td>
                        <td className="text-end">{formatCurrency(data.dr2)}</td>
                      </tr>
                      <tr>
                        <td>Recon CR</td>
                        <td className="text-end">{formatCurrency(data.cr)}</td>
                      </tr>
                      <tr>
                        <td className="fw-semibold">Recon Terminal</td>
                        <td className="text-end fw-semibold">
                          {formatCurrency(
                            Number(data.dr1) +
                              Number(data.dr2) +
                              Number(data.cr)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Summary Terminal */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-bold mb-4">Summary Terminal</h5>

                <div className="table-responsive">
                  <table className="table table-bordered">
                    {/* <thead>
                      <tr>
                        <th>Card Type</th>
                        <th className="text-end">Amount (RM)</th>
                        <th>Recon Type</th>
                        <th className="text-end">Recon Amount (RM)</th>
                        <th></th>
                        <th className="text-end">Commission (RM)</th>
                        <th className="text-end">Rate %</th>
                      </tr>
                    </thead> */}
                    <tbody>
                      <tr>
                        <td>Visa</td>
                        <td className="text-end">
                          {formatCurrency(data.visa)}
                        </td>
                        <td rowSpan="4" className="align-middle">
                          Recon Terminal
                        </td>
                        <td rowSpan="4" className="text-end align-middle">
                          {formatCurrency(
                            Number(data.dr1) +
                              Number(data.dr2) +
                              Number(data.cr)
                          )}
                        </td>
                        <td rowSpan="4" className="align-middle">
                          Commision
                        </td>
                        <td
                          rowSpan="4"
                          className="text-end align-middle fw-semibold"
                        >
                          {formatCurrency(data.comission)}
                        </td>
                        <td
                          rowSpan="4"
                          className="text-end align-middle fw-semibold"
                        >
                          {(
                            (Number(data.comission) /
                              (Number(data.visa) +
                                Number(data.master) +
                                Number(data.my_debit))) *
                            100
                          ).toFixed(2)}
                          %
                        </td>
                      </tr>
                      <tr>
                        <td>Master</td>
                        <td className="text-end">
                          {formatCurrency(data.master)}
                        </td>
                      </tr>
                      <tr>
                        <td>Mydebit</td>
                        <td className="text-end">
                          {formatCurrency(data.my_debit)}
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-semibold">Terimal</td>
                        <td className="text-end fw-semibold">
                          {formatCurrency(
                            Number(data.visa) +
                              Number(data.master) +
                              Number(data.my_debit)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
export default MonthSalesSummary;
