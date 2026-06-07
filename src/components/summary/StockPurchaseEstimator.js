import React, { useState, useEffect } from "react";

const BASE_URL = "http://121.121.232.54:88/aero-foods";

const CAFES = [
  { value: "aero_foods_finance",       label: "Mixue" },
  { value: "amazon_cafe_finance",      label: "D' Amazon Cafe" },
  { value: "amazon_cafe_finance_lyp",  label: "D' Amazon Cafe LYP" },
  { value: "abe_yus_finance",          label: "Aby Yus" },
  { value: "ojim_finance",             label: "Ojim Cafe" },
];

function StockPurchaseEstimator({ month, year }) {
  const [selectedDb, setSelectedDb] = useState("aero_foods_finance");
  const [currentStockValue, setCurrentStockValue] = useState(0);
  const [currentMonthStockPurchased, setCurrentMonthStockPurchased] = useState(0);
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  const [stockCapLimit, setStockCapLimit] = useState(45);
  const [newStockPurchaseAmount, setNewStockPurchaseAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolvedMonth = Array.isArray(month) ? parseInt(month[0], 10) : parseInt(month, 10);
  const resolvedYear  = parseInt(year, 10);

  useEffect(() => {
    if (!resolvedMonth || !resolvedYear) return;
    const url = `${BASE_URL}/stock_estimator_data.php?month=${resolvedMonth}&year=${resolvedYear}&db=${selectedDb}`;
    console.log("[StockEstimator] fetching:", url);
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        console.log("[StockEstimator] response:", d);
        if (d.error) throw new Error(d.error);
        setCurrentStockValue(d.current_stock_value);
        setCurrentMonthStockPurchased(d.current_month_stock_purchased);
        setCurrentMonthSales(d.current_month_sales);
      })
      .catch((e) => {
        console.error("[StockEstimator] error:", e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [resolvedMonth, resolvedYear, selectedDb]);

  const sales          = parseFloat(currentMonthSales) || 0;
  const stockPurchased = parseFloat(currentMonthStockPurchased) || 0;
  const newAmount      = parseFloat(newStockPurchaseAmount) || 0;
  const capLimit       = parseFloat(stockCapLimit) || 0;

  const currentStockPercent = sales > 0 ? (stockPurchased / sales) * 100 : 0;
  const totalNewStock       = stockPurchased + newAmount;
  const percentCurrentStock = sales > 0 ? (totalNewStock / sales) * 100 : 0;
  const deltaPercStock      = capLimit - percentCurrentStock;
  const maxPurchaseBalance  = (capLimit / 100) * sales - totalNewStock;
  const isGood              = deltaPercStock > 0;

  const s = {
    label: { fontWeight: 600, fontSize: "13px", color: "#374151", minWidth: "210px" },
    value: { textAlign: "right", fontWeight: 600, fontSize: "13px", minWidth: "110px", paddingRight: "12px" },
    input: {
      textAlign: "right", fontWeight: 600, fontSize: "13px",
      width: "120px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "2px 6px",
    },
    row: { display: "flex", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" },
  };

  return (
    <div style={{ border: "2px dashed #16a34a", borderRadius: "8px", padding: "16px", marginTop: "24px", backgroundColor: "#fff" }}>
      <h5 style={{ fontWeight: 700, marginBottom: "12px", color: "#111827" }}>Stock Purchase Estimator</h5>

      {/* Cafe radio buttons */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "14px" }}>
        {CAFES.map((cafe) => (
          <label key={cafe.value} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: selectedDb === cafe.value ? "#16a34a" : "#374151" }}>
            <input
              type="radio"
              name="cafe"
              value={cafe.value}
              checked={selectedDb === cafe.value}
              onChange={() => setSelectedDb(cafe.value)}
            />
            {cafe.label}
          </label>
        ))}
      </div>

      {error && (
        <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "8px" }}>
          Error: {error}
        </div>
      )}

      {loading && (
        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Loading...</div>
      )}

      {/* ── INPUTS ── */}
      <div style={s.row}>
        <span style={s.label}>Current Stock Value</span>
        <input style={s.input} type="number" value={currentStockValue}
          onChange={(e) => setCurrentStockValue(e.target.value)} />
      </div>

      <div style={s.row}>
        <span style={s.label}>Current Month Stock Purchased</span>
        <input style={s.input} type="number" value={currentMonthStockPurchased}
          onChange={(e) => setCurrentMonthStockPurchased(e.target.value)} />
      </div>

      <div style={s.row}>
        <span style={s.label}>Current Month Sales</span>
        <input style={s.input} type="number" value={currentMonthSales}
          onChange={(e) => setCurrentMonthSales(e.target.value)} />
      </div>

      <div style={s.row}>
        <span style={s.label}>Stock Cap Limits %</span>
        <input style={s.input} type="number" value={stockCapLimit}
          onChange={(e) => setStockCapLimit(e.target.value)} />
      </div>

      <div style={s.row}>
        <span style={s.label}>Current Stock %</span>
        <span style={s.value}>{currentStockPercent.toFixed(0)}%</span>
      </div>

      <div style={s.row}>
        <span style={s.label}>New Stock Purchase Amount</span>
        <input style={{ ...s.input, backgroundColor: "#fef08a" }} type="number"
          value={newStockPurchaseAmount}
          onChange={(e) => setNewStockPurchaseAmount(e.target.value)} />
      </div>

      {/* ── DIVIDER ── */}
      <hr style={{ margin: "14px 0", borderColor: "#d1d5db" }} />
      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#111827" }}>Result</div>

      {/* ── RESULTS ── */}
      <div style={s.row}>
        <span style={{ ...s.label, color: "#1d4ed8" }}>Total New Stock</span>
        <span style={{ ...s.value, color: "#1d4ed8" }}>{totalNewStock.toFixed(2)}</span>
      </div>

      <div style={s.row}>
        <span style={{ ...s.label, color: "#1d4ed8" }}>% Current Stock</span>
        <span style={{ ...s.value, color: "#1d4ed8" }}>{percentCurrentStock.toFixed(0)}%</span>
      </div>

      <div style={s.row}>
        <span style={{ ...s.label, color: "#1d4ed8" }}>Delta % Stock</span>
        <span style={{ ...s.value, color: "#1d4ed8" }}>{deltaPercStock.toFixed(0)}%</span>
      </div>

      <div style={s.row}>
        <span style={{ ...s.label, color: "#1d4ed8" }}>Max Purchase Balance</span>
        <span style={{ ...s.value, color: "#1d4ed8" }}>{maxPurchaseBalance.toFixed(2)}</span>
      </div>

      <div style={{ ...s.row, borderBottom: "none" }}>
        <span style={{ ...s.label, color: "#1d4ed8" }}>Stock Standing</span>
        <span style={{ minWidth: "110px", paddingRight: "12px", textAlign: "right" }}>
          <span style={{
            display: "inline-block", padding: "2px 14px", borderRadius: "4px",
            fontWeight: 700, fontSize: "13px",
            backgroundColor: isGood ? "#16a34a" : "#dc2626", color: "#fff",
          }}>
            {isGood ? "Good" : "Bad"}
          </span>
        </span>
      </div>
    </div>
  );
}

export default StockPurchaseEstimator;
