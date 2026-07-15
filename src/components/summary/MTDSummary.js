import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import TimesheetSB from "./TimeSheetSB";
import MonthSalesSummary from "./MonthSalesSummary";
import SalarySummary from "./SalarySummary";
import StockPurchaseEstimator from "./StockPurchaseEstimator";
import MonthlySalary from "./MonthlySalary";

function MTDSummary() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return [month];
  });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("tables");
  const [hqExpense, setHqExpense] = useState(0);

  // Generate year options (current year and previous 2 years)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  };

  const [visibleLines, setVisibleLines] = useState({
    Mixue: true,
    AbyYus: true,
    Amazon: true,
    Ojim: true,
    AmazonLYP: true,
    MixueSogo: true,
    SDS: true,
  });
  const handleYearChange = (newYear) => {
    setSelectedYear(parseInt(newYear));
    // Reset to current month only
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonths([currentMonth]);
  };
  function handleToggle(line) {
    setVisibleLines({ ...visibleLines, [line]: !visibleLines[line] });
  }

  const [visibleLines1, setVisibleLines1] = useState({
    Mixue: true,
    AbyYus: true,
    Amazon: true,
    Ojim: true,
    AmazonLYP: true,
    MixueSogo: true,
    SDS: true,
  });

  function handleToggle1(line) {
    setVisibleLines1({ ...visibleLines1, [line]: !visibleLines1[line] });
  }

  // Generate month options
  const generateMonthOptions = () => {
    const months = [
      { value: "01", label: "January" },
      { value: "02", label: "February" },
      { value: "03", label: "March" },
      { value: "04", label: "April" },
      { value: "05", label: "May" },
      { value: "06", label: "June" },
      { value: "07", label: "July" },
      { value: "08", label: "August" },
      { value: "09", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ];
    return months;
  };

  // Add this with your other useState declarations
  const [visibleCafes, setVisibleCafes] = useState({
    Mixue: true,
    "Aby Yus": true,
    "D' Amazon Café": true,
    "Ojim Café": true,
    "D' Amazon Café LYP": true,
    "Mixue Sogo": true,
  });

  // Add this handler function
  const handleCafeToggle = (cafeName) => {
    setVisibleCafes((prev) => ({
      ...prev,
      [cafeName]: !prev[cafeName],
    }));
  };

  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  const fetchDataForStore = async (month, endpoint) => {
    try {
      const response = await fetch(
        `http://121.121.232.54:88/aero-foods/${endpoint}?month=${month}&year=${selectedYear}`,
      );
      const fetchedData = await response.json();

      // Handle both old format (array) and new format (object with monthly_data)
      const monthlyData = Array.isArray(fetchedData)
        ? fetchedData
        : fetchedData.monthly_data || [];

      const overallStats = fetchedData.overall_stats || null;

      const processedData = monthlyData
        .map((item) => ({
          ...item,
          total_sales: parseFloat(item.total_sales || 0),
          total_actual: parseFloat(item.total_actual || 0),
          total_variance: parseFloat(item.total_variance || 0),
          cash_box: parseFloat(item.cash_box || 0),
          total_expense: item.total_expense
            ? parseFloat(item.total_expense)
            : null,
          day_of_week: new Date(item.month_date).toLocaleDateString("en-US", {
            weekday: "long",
          }),
        }))
        .sort((a, b) => new Date(a.month_date) - new Date(b.month_date));

      return { data: processedData, overallStats };
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      return { data: [], overallStats: null };
    }
  };
  const calculateTotals = (data) => {
    return data.reduce(
      (acc, item) => ({
        total_sales: acc.total_sales + item.total_sales,
        total_actual: acc.total_actual + item.total_actual,
        total_expense: acc.total_expense + (item.total_expense || 0),
        total_cash_box: acc.total_cash_box + (item.cash_box || 0),
      }),
      { total_sales: 0, total_actual: 0, total_expense: 0, total_cash_box: 0 },
    );
  };

  const fetchDataForMonth = async (month) => {
    try {
      const [
        mixieResult,
        abyYusResult,
        amazonResult,
        OjimResult,
        amazonLYPResult,
        mixueSogoResult,
      ] = await Promise.all([
        fetchDataForStore(month, "mon-sum-mixiue.php"),
        fetchDataForStore(month, "mon-sum-mixiue2.php"),
        fetchDataForStore(month, "mon-sum-mixiue3.php"),
        fetchDataForStore(month, "mon-sum-mixiue5.php"),
        fetchDataForStore(month, "mon-sum-mixiue6.php"),
        fetch(`http://121.121.232.54:88/mixue-sogo/mon-sum-mixiue7.php?month=${month}&year=${selectedYear}`)
          .then((r) => r.json())
          .then((d) => ({
            data: (Array.isArray(d) ? d : d.monthly_data || []).map((item) => ({
              ...item,
              total_sales: parseFloat(item.total_sales || 0),
              total_actual: parseFloat(item.total_actual || 0),
              total_variance: parseFloat(item.total_variance || 0),
              cash_box: parseFloat(item.cash_box || 0),
              total_expense: item.total_expense ? parseFloat(item.total_expense) : null,
            })),
            overallStats: d.overall_stats || null,
          }))
          .catch(() => ({ data: [], overallStats: null })),
      ]);

      const stores = [
        {
          name: "Mixue",
          data: mixieResult.data,
          totals: calculateTotals(mixieResult.data),
          overallStats: mixieResult.overallStats,
        },
        {
          name: "Aby Yus",
          data: abyYusResult.data,
          totals: calculateTotals(abyYusResult.data),
          overallStats: abyYusResult.overallStats,
        },
        {
          name: "D' Amazon Café",
          data: amazonResult.data,
          totals: calculateTotals(amazonResult.data),
          overallStats: amazonResult.overallStats,
        },
        {
          name: "Ojim Café",
          data: OjimResult.data,
          totals: calculateTotals(OjimResult.data),
          overallStats: OjimResult.overallStats,
        },
        {
          name: "D' Amazon Café LYP",
          data: amazonLYPResult.data,
          totals: calculateTotals(amazonLYPResult.data),
          overallStats: amazonLYPResult.overallStats,
        },
        {
          name: "Mixue Sogo",
          data: mixueSogoResult.data,
          totals: calculateTotals(mixueSogoResult.data),
          overallStats: mixueSogoResult.overallStats,
        },
      ];

      const sdsTotal = stores.reduce(
        (acc, store) => ({
          total_sales: acc.total_sales + store.totals.total_sales,
          total_actual: acc.total_actual + store.totals.total_actual,
          total_expense: acc.total_expense + store.totals.total_expense,
          total_cash_box:
            acc.total_cash_box + (store.totals.total_cash_box || 0),
        }),
        {
          total_sales: 0,
          total_actual: 0,
          total_expense: 0,
          total_cash_box: 0,
        },
      );

      // Calculate SDS overall stats
      const sdsOverallStats = stores.reduce(
        (acc, store) => {
          if (store.overallStats) {
            return {
              overall_actual:
                acc.overall_actual +
                (parseFloat(store.overallStats.overall_actual) || 0),
              overall_expense:
                acc.overall_expense +
                (parseFloat(store.overallStats.overall_expense) || 0),
              overall_profit:
                acc.overall_profit +
                (parseFloat(store.overallStats.overall_profit) || 0),
            };
          }
          return acc;
        },
        { overall_actual: 0, overall_expense: 0, overall_profit: 0 },
      );

      if (sdsOverallStats.overall_actual > 0) {
        sdsOverallStats.overall_profit_percentage =
          (sdsOverallStats.overall_profit / sdsOverallStats.overall_actual) *
          100;
      } else {
        sdsOverallStats.overall_profit_percentage = 0;
      }

      stores.push({
        name: "SDS",
        totals: sdsTotal,
        overallStats: sdsOverallStats,
        isTotal: true,
      });

      return stores;
    } catch (err) {
      console.error(`Error fetching data for month ${month}:`, err);
      return [];
    }
  };

  const fetchAllData = async () => {
    if (selectedMonths.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const monthDataPromises = selectedMonths.map((month) =>
        fetchDataForMonth(month).then((stores) => ({ month, stores })),
      );

      // Fetch HQ expense total for selected months + year
      const hqPromises = selectedMonths.map((month) =>
        fetch(
          `http://121.121.232.54:88/aero-foods/get_hq_expense.php?month=${month}&year=${selectedYear}`,
        )
          .then((r) => r.json())
          .then((j) => parseFloat(j.total_expense || 0))
          .catch(() => 0),
      );

      const [results, ...hqAmounts] = await Promise.all([
        Promise.all(monthDataPromises),
        ...hqPromises,
      ]);

      const dataByMonth = {};
      results.forEach(({ month, stores }) => {
        dataByMonth[month] = stores;
      });

      setData(dataByMonth);
      setHqExpense(hqAmounts.reduce((s, v) => s + v, 0));
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error fetching all data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedMonths, selectedYear]);

  const handleMonthChange = (monthValue) => {
    setSelectedMonths((prev) => {
      if (prev.includes(monthValue)) {
        return prev.filter((month) => month !== monthValue);
      } else {
        return [...prev, monthValue].sort();
      }
    });
  };

  const selectAllMonths = () => {
    setSelectedMonths(monthOptions.map((option) => option.value));
  };

  const clearAllMonths = () => {
    setSelectedMonths([]);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    return `RM${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  };

  const calculateROI = (profit, cost) => {
    const res = ((profit - cost) / cost) * 100;
    return formatPercentage(res);
  };

  const formatPercentage = (value) => {
    return Math.round(value) + "%";
  };

  const calculateCostPercentage = (expense, actual) => {
    return actual > 0 ? (expense / actual) * 100 : 0;
  };

  const calculateProfit = (actual, expense) => {
    return actual - expense;
  };

  const calculateProfitPercentage = (profit, actual) => {
    return actual > 0 ? (profit / actual) * 100 : 0;
  };

  const getMonthDisplayName = (monthValue) => {
    const option = monthOptions.find((opt) => opt.value === monthValue);
    return option ? option.label : monthValue;
  };

  // Calculate combined totals for all selected months
  // Calculate combined totals for all selected months
  const calculateCombinedTotals = () => {
    const storeNames = [
      "Mixue",
      "Aby Yus",
      "D' Amazon Café",
      "Ojim Café",
      "D' Amazon Café LYP",
      "Mixue Sogo",
    ];
    const invest = [280, 40, 80, 60, 105, 280];
    const combinedData = [];

    storeNames.forEach((storeName, index) => {
      let combinedTotals = {
        total_sales: 0,
        total_actual: 0,
        total_expense: 0,
        total_cash_box: 0,
      };

      // Get overallStats from the first month's data (they should be the same for all months)
      let overallStats = null;

      selectedMonths.forEach((month) => {
        const monthData = data[month];
        if (monthData) {
          const storeData = monthData.find((store) => store.name === storeName);
          if (storeData) {
            combinedTotals.total_sales += storeData.totals.total_sales;
            combinedTotals.total_actual += storeData.totals.total_actual;
            combinedTotals.total_expense += storeData.totals.total_expense;
            combinedTotals.total_cash_box += storeData.totals.total_cash_box;

            // Capture overallStats (they should be the same across all months for a store)
            if (!overallStats && storeData.overallStats) {
              overallStats = storeData.overallStats;
            }
          }
        }
      });

      combinedData.push({
        name: storeName,
        totals: combinedTotals,
        invst: invest[index],
        overallStats: overallStats, // ✅ Add overallStats here
      });
    });

    // Calculate SDS total
    const sdsTotal = combinedData.reduce(
      (acc, store) => ({
        total_sales: acc.total_sales + store.totals.total_sales,
        total_actual: acc.total_actual + store.totals.total_actual,
        total_expense: acc.total_expense + store.totals.total_expense,
        total_cash_box: acc.total_cash_box + store.totals.total_cash_box,
      }),
      { total_sales: 0, total_actual: 0, total_expense: 0, total_cash_box: 0 },
    );

    const totalInvestment = combinedData.reduce(
      (sum, store) => sum + store.invst,
      0,
    );

    // Calculate SDS overall stats
    const sdsOverallStats = combinedData.reduce(
      (acc, store) => {
        if (store.overallStats) {
          return {
            overall_actual:
              acc.overall_actual +
              (parseFloat(store.overallStats.overall_actual) || 0),
            overall_expense:
              acc.overall_expense +
              (parseFloat(store.overallStats.overall_expense) || 0),
            overall_profit:
              acc.overall_profit +
              (parseFloat(store.overallStats.overall_profit) || 0),
          };
        }
        return acc;
      },
      { overall_actual: 0, overall_expense: 0, overall_profit: 0 },
    );

    // Deduct HQ expense from overall profit
    sdsOverallStats.overall_profit = sdsOverallStats.overall_profit - hqExpense;

    if (sdsOverallStats.overall_actual > 0) {
      sdsOverallStats.overall_profit_percentage =
        (sdsOverallStats.overall_profit / sdsOverallStats.overall_actual) * 100;
    } else {
      sdsOverallStats.overall_profit_percentage = 0;
    }

    // Add HQ Expense row (only total_expense populated)
    combinedData.push({
      name: "HQ Expense",
      totals: {
        total_sales: null,
        total_actual: null,
        total_expense: hqExpense,
        total_cash_box: null,
      },
      invst: null,
      overallStats: null,
      isHQExpense: true,
    });

    combinedData.push({
      name: "SDS",
      totals: {
        ...sdsTotal,
        total_expense: sdsTotal.total_expense + hqExpense,
      },
      invst: totalInvestment,
      overallStats: sdsOverallStats,
      isTotal: true,
    });

    return combinedData;
  };
  // Prepare chart data
  const prepareChartData = () => {
    const chartData = [];
    const storeColors = {
      Mixue: "#8884d8",
      "Aby Yus": "#82ca9d",
      "D' Amazon Café": "#ffc658",
      Ojim: "#d4edda",
      "D' Amazon Café LYP": "#e8536f",
      "Mixue Sogo": "#c084fc",
      SDS: "#ff7300",
    };

    selectedMonths.sort().forEach((month) => {
      const monthData = data[month];
      if (monthData) {
        const dataPoint = {
          month: getMonthDisplayName(month),
          monthKey: month,
        };

        monthData.forEach((store) => {
          if (store.totals.total_sales > 0) {
            dataPoint[`${store.name}_sales`] = store.totals.total_sales;
          }
          if (store.totals.total_actual > 0) {
            dataPoint[`${store.name}_actual`] = store.totals.total_actual;
          }
          dataPoint[`${store.name}_expense`] = store.totals.total_expense;
          dataPoint[`${store.name}_profit`] = calculateProfit(
            store.totals.total_actual,
            store.totals.total_expense,
          );
        });

        chartData.push(dataPoint);
      }
    });

    return { chartData, storeColors };
  };

  // Prepare pie data based on combined data from all selected months
  const preparePieData = () => {
    if (selectedMonths.length === 0) return [];

    const combinedTotals = calculateCombinedTotals();

    return combinedTotals
      .filter((store) => !store.isTotal && store.totals.total_actual > 0)
      .map((store) => ({
        name: store.name,
        value: store.totals.total_actual,
        color:
          store.name === "Mixue"
            ? "#8884d8"
            : store.name === "Aby Yus"
              ? "#82ca9d"
              : store.name === "D' Amazon Café"
                ? "#ffc658"
                : store.name === "Ojim Café"
                  ? "#d4edda"
                  : store.name === "D' Amazon Café LYP"
                    ? "#e8536f"
                    : store.name === "Mixue Sogo"
                      ? "#c084fc"
                      : "#ffc658",
      }));
  };

  const preparePieData1 = () => {
    if (selectedMonths.length === 0) return [];

    const combinedTotals = calculateCombinedTotals();

    return combinedTotals
      .filter((store) => !store.isTotal)
      .map((store) => ({
        name: store.name,
        value: calculateProfit(
          store.totals.total_actual,
          store.totals.total_expense,
        ),
        color:
          store.name === "Mixue"
            ? "#8884d8"
            : store.name === "Aby Yus"
              ? "#82ca9d"
              : store.name === "D' Amazon Café"
                ? "#ffc658"
                : store.name === "Ojim Café"
                  ? "#d4edda"
                  : store.name === "D' Amazon Café LYP"
                    ? "#e8536f"
                    : store.name === "Mixue Sogo"
                      ? "#c084fc"
                      : "#ffc658",
      }));
  };

  const { chartData, storeColors } = prepareChartData();
  const pieData = preparePieData();
  const pieData1 = preparePieData1();

  const combinedTotals = calculateCombinedTotals();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        <div style={{ fontSize: "18px" }}>
          Loading store performance data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        <div style={{ color: "red", fontSize: "18px" }}>{error}</div>
      </div>
    );
  }

  const isFutureMonthYear = (year, month) => {
    const now = new Date();
    const selectedDate = new Date(year, parseInt(month) - 1, 1);
    return selectedDate > new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const getSelectedMonthsDisplay = () => {
    if (selectedMonths.length === 0) return "";
    if (selectedMonths.length === 1)
      return getMonthDisplayName(selectedMonths[0]);

    const sortedMonths = [...selectedMonths].sort();
    const monthNames = sortedMonths.map((month) => getMonthDisplayName(month));

    if (monthNames.length <= 3) {
      return monthNames.join(", ");
    } else {
      return `${monthNames.slice(0, 2).join(", ")} and ${
        monthNames.length - 2
      } more`;
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "16px" }}
        >
          Multi-Month Store Performance Dashboard
        </h1>

        {/* Year and Month Selection */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontWeight: "500" }}>Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {/* Profit & Loss Tab */}

              <div style={{ width: "70vw", marginLeft: "0", marginRight: "0" }}>
                {activeTab === "profitloss" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "32px",
                      width: "100%",
                    }}
                  >
                    {/* Combined P&L Chart */}
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "24px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        width: "100%",
                      }}
                    >
                      <h3
                        style={{
                          marginBottom: "16px",
                          fontSize: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        Profit & Loss Analysis
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "normal",
                            color: "#666",
                            marginTop: "4px",
                          }}
                        >
                          Combined data from {selectedMonths.length} month
                          {selectedMonths.length !== 1 ? "s" : ""}
                        </div>
                      </h3>
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart
                          layout="vertical"
                          data={combinedTotals
                            .filter((store) => !store.isTotal)
                            .map((store) => {
                              const profit = calculateProfit(
                                store.totals.total_actual,
                                store.totals.total_expense,
                              );
                              return {
                                name: store.name,
                                Revenue: store.totals.total_actual,
                                Expenses: store.totals.total_expense,
                                Profit:
                                  profit >= 0 ? profit : -Math.abs(profit),
                                // Loss: profit < 0 ? -Math.abs(profit) : 0 // negative for left
                              };
                            })}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <YAxis type="category" dataKey="name" />
                          <XAxis
                            type="number"
                            tickFormatter={(value) =>
                              `RM${(Math.abs(value) / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            formatter={(value) =>
                              formatCurrency(Math.abs(value))
                            }
                          />
                          <Legend />
                          <Bar
                            dataKey="Revenue"
                            fill="#28a745"
                            name="Revenue"
                          />
                          <Bar
                            dataKey="Expenses"
                            fill="#d6dc35ff"
                            name="Expenses"
                          />
                          <Bar dataKey="Profit" fill="#007bff" name="P/L" />
                          {/* <Bar dataKey="Loss" fill="#ff4444" name="Loss" /> */}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Overall SDS Total Chart */}
                    {(() => {
                      const sdsData = combinedTotals.find(
                        (store) => store.isTotal,
                      );
                      if (!sdsData) return null;

                      const totalProfit = calculateProfit(
                        sdsData.totals.total_actual,
                        sdsData.totals.total_expense,
                      );
                      const chartData = [
                        {
                          name: "SDS Total",
                          Revenue: sdsData.totals.total_actual,
                          Expenses: sdsData.totals.total_expense,
                          Profit: totalProfit, //>= 0 ? totalProfit : 0,
                          // Loss: totalProfit < 0 ? Math.abs(totalProfit) : 0
                        },
                      ];

                      return (
                        <div
                          style={{
                            backgroundColor: "white",
                            padding: "24px",
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          }}
                        >
                          <h3
                            style={{
                              marginBottom: "16px",
                              fontSize: "20px",
                              fontWeight: "bold",
                            }}
                          >
                            Overall Company Performance
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis
                                tickFormatter={(value) =>
                                  `RM${(value / 1000).toFixed(0)}K`
                                }
                              />
                              <Tooltip
                                formatter={(value) => formatCurrency(value)}
                              />
                              <Legend />
                              <Bar
                                dataKey="Revenue"
                                fill="#28a745"
                                name="Total Revenue"
                              />
                              <Bar
                                dataKey="Expenses"
                                fill="#d6dc35ff"
                                name="Total Expenses"
                              />
                              <Bar dataKey="Profit" fill="#007bff" name="P/L" />
                              {/* <Bar dataKey="Loss" fill="#ff4444" name="Total Loss" /> */}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                onClick={selectAllMonths}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Select All Months
              </button>
              <button
                onClick={clearAllMonths}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Clear All
              </button>
              <button
                onClick={fetchAllData}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Refresh Data
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontWeight: "500",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Select Months:
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "8px",
                padding: "16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                backgroundColor: "#f8f9fa",
              }}
            >
              {monthOptions.map((option) => {
                const disabled = isFutureMonthYear(selectedYear, option.value);
                return (
                  <label
                    key={option.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(option.value)}
                      onChange={() =>
                        !disabled && handleMonthChange(option.value)
                      }
                      disabled={disabled}
                      style={{ margin: "0" }}
                    />
                    <span style={{ fontSize: "14px" }}>{option.label}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
              Selected: {selectedMonths.length} month
              {selectedMonths.length !== 1 ? "s" : ""} for {selectedYear}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{ borderBottom: "2px solid #e9ecef", marginBottom: "24px" }}
        >
          <div style={{ display: "flex", gap: "0" }}>
            {[
              "tables",
              "sds",
              "stock_estimator",
              "timesheet_summary",
              "salary_summary",
              "monthly_sales_summary",
              "monthly_salary",
              "trends",
              "comparison",
              "distribution",
              "profitloss",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  backgroundColor:
                    activeTab === tab ? "#007bff" : "transparent",
                  color: activeTab === tab ? "white" : "#666",
                  cursor: "pointer",
                  borderRadius: "4px 4px 0 0",
                  fontSize: "16px",
                  fontWeight: activeTab === tab ? "bold" : "normal",
                }}
              >
                {tab === "tables"
                  ? "Data Summary"
                  : tab === "timesheet_summary"
                    ? "Time Sheet Summary Brand & Staff"
                    : tab === "salary_summary"
                      ? "Salary Summary"
                      : tab === "monthly_sales_summary"
                      ? "Monthly Sales Summary"
                      : tab === "monthly_salary"
                        ? "Monthly Salary"
                      : tab === "sds"
                        ? "Daily Data Summary"
                        : tab === "stock_estimator"
                        ? "Stock Purchase Estimator"
                        : tab === "trends"
                          ? "Trends"
                          : tab === "comparison"
                            ? "Store Comparison"
                            : tab === "distribution"
                              ? "Revenue Distribution"
                              : "Profit & Loss"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedMonths.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          Please select at least one month to view data.
        </div>
      ) : (
        <div>
          {/* Combined Data Table Tab */}
          {activeTab === "tables" && (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  padding: "12px 16px",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                Combined Summary - {getSelectedMonthsDisplay()} {selectedYear}
                {selectedMonths.length > 1 && (
                  <span style={{ fontSize: "14px", opacity: 0.9 }}>
                    {" "}
                    ({selectedMonths.length} months)
                  </span>
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "left",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        Store
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#d4edda",
                        }}
                      >
                        Total Sales
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        Total Actual
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        Total Expenses
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        Cash Box Amount
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        % Cost
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        Profit
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        % Profit
                      </th>

                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#d1ecf1",
                        }}
                      >
                        Overall Profit
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#d1ecf1",
                        }}
                      >
                        % Overall Profit
                      </th>

                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        Investment Cost
                      </th>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        ROI(%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedTotals.map((store) => {
                      if (store.isHQExpense) {
                        return (
                          <tr key="HQ Expense" style={{ backgroundColor: "#fff8e1" }}>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left", fontWeight: "500" }}>
                              HQ Expense
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", backgroundColor: "#f8f9fa" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right" }}>
                              {formatCurrency(store.totals.total_expense)}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "center" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "center" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", backgroundColor: "#d1ecf1" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "center", backgroundColor: "#d1ecf1" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "center" }}>—</td>
                            <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "center" }}>—</td>
                          </tr>
                        );
                      }

                      const costPercentage = calculateCostPercentage(
                        store.totals.total_expense,
                        store.totals.total_actual,
                      );
                      const profit = calculateProfit(
                        store.totals.total_actual,
                        store.totals.total_expense,
                      );
                      const profitPercentage = calculateProfitPercentage(
                        profit,
                        store.totals.total_actual,
                      );

                      return (
                        <tr
                          key={store.name}
                          style={
                            store.isTotal
                              ? {
                                  backgroundColor: "#e8f5e8",
                                  fontWeight: "bold",
                                }
                              : {}
                          }
                        >
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "left",
                              fontWeight: "500",
                              backgroundColor: store.isTotal
                                ? "#d4edda"
                                : "transparent",
                            }}
                          >
                            {store.name}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "right",
                              backgroundColor: store.isTotal
                                ? "#d4edda"
                                : "#f8f9fa",
                            }}
                          >
                            {formatCurrency(store.totals.total_sales)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "right",
                            }}
                          >
                            {formatCurrency(store.totals.total_actual)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "right",
                            }}
                          >
                            {formatCurrency(store.totals.total_expense)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "right",
                            }}
                          >
                            {formatCurrency(store.totals.total_cash_box)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            {formatPercentage(costPercentage)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "right",
                            }}
                          >
                            {formatCurrency(profit)}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            {formatPercentage(profitPercentage)}
                          </td>

                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "right",
                              backgroundColor: "#d1ecf1",
                              fontWeight: store.isTotal ? "bold" : "normal",
                            }}
                          >
                            {store.overallStats
                              ? formatCurrency(
                                  store.overallStats.overall_profit,
                                )
                              : "N/A"}
                          </td>

                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "center",
                              backgroundColor: "#d1ecf1",
                              fontWeight: store.isTotal ? "bold" : "normal",
                            }}
                          >
                            {store.overallStats
                              ? formatPercentage(
                                  store.overallStats.overall_profit_percentage,
                                )
                              : "N/A"}
                          </td>

                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            {formatCurrency(store.invst * 1000)}
                          </td>

                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "12px",
                              textAlign: "center",
                            }}
                          >
                            {store.overallStats &&
                            store.overallStats.overall_profit !== undefined
                              ? calculateROI(
                                  store.overallStats.overall_profit,
                                  store.invst * 1000,
                                )
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Daily Data Summary Tab */}
          {/* Daily Data Summary Tab */}
          {activeTab === "sds" && (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  padding: "12px 16px",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                Daily Sales Summary - {getSelectedMonthsDisplay()}{" "}
                {selectedYear}
                {selectedMonths.length > 1 && (
                  <span style={{ fontSize: "14px", opacity: 0.9 }}>
                    {" "}
                    ({selectedMonths.length} months)
                  </span>
                )}
              </div>

              {/* Cafe Toggle Controls */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderBottom: "1px solid #ddd",
                }}
              >
                <div style={{ fontWeight: "500", marginBottom: "8px" }}>
                  Show/Hide Cafes:
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCafes.Mixue}
                      onChange={() => handleCafeToggle("Mixue")}
                    />
                    <span>Mixue</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCafes["Aby Yus"]}
                      onChange={() => handleCafeToggle("Aby Yus")}
                    />
                    <span>Aby Yus</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCafes["D' Amazon Café"]}
                      onChange={() => handleCafeToggle("D' Amazon Café")}
                    />
                    <span>D' Amazon Café</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCafes["Ojim Café"]}
                      onChange={() => handleCafeToggle("Ojim Café")}
                    />
                    <span>Ojim Café</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCafes["D' Amazon Café LYP"]}
                      onChange={() => handleCafeToggle("D' Amazon Café LYP")}
                    />
                    <span>D' Amazon Café LYP</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCafes["Mixue Sogo"]}
                      onChange={() => handleCafeToggle("Mixue Sogo")}
                    />
                    <span>Mixue Sogo</span>
                  </label>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "left",
                          fontWeight: "bold",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        Date
                      </th>
                      {visibleCafes.Mixue && (
                        <th
                          style={{
                            border: "1px solid #ddd",
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          Mixue
                        </th>
                      )}
                      {visibleCafes["Aby Yus"] && (
                        <th
                          style={{
                            border: "1px solid #ddd",
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          Aby Yus
                        </th>
                      )}
                      {visibleCafes["D' Amazon Café"] && (
                        <th
                          style={{
                            border: "1px solid #ddd",
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          D' Amazon Café
                        </th>
                      )}
                      {visibleCafes["Ojim Café"] && (
                        <th
                          style={{
                            border: "1px solid #ddd",
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          Ojim Café
                        </th>
                      )}
                      {visibleCafes["D' Amazon Café LYP"] && (
                        <th
                          style={{
                            border: "1px solid #ddd",
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          D' Amazon Café LYP
                        </th>
                      )}
                      {visibleCafes["Mixue Sogo"] && (
                        <th
                          style={{
                            border: "1px solid #ddd",
                            padding: "12px",
                            textAlign: "center",
                            fontWeight: "bold",
                            backgroundColor: "#f3e8ff",
                          }}
                        >
                          Mixue Sogo
                        </th>
                      )}
                      <th
                        style={{
                          border: "1px solid #ddd",
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          backgroundColor: "#d4edda",
                        }}
                      >
                        Daily Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Collect all unique dates from all months and stores
                      const dateMap = new Map();
                      const storeTotals = {
                        Mixue: 0,
                        "Aby Yus": 0,
                        "D' Amazon Café": 0,
                        "Ojim Café": 0,
                        "D' Amazon Café LYP": 0,
                        "Mixue Sogo": 0,
                      };

                      selectedMonths.forEach((month) => {
                        const monthData = data[month];
                        if (monthData) {
                          monthData.forEach((store) => {
                            if (store.data) {
                              store.data.forEach((dayData) => {
                                const dateKey = dayData.month_date;
                                if (!dateMap.has(dateKey)) {
                                  dateMap.set(dateKey, {
                                    date: dateKey,
                                    Mixue: 0,
                                    "Aby Yus": 0,
                                    "D' Amazon Café": 0,
                                    "Ojim Café": 0,
                                    "D' Amazon Café LYP": 0,
                                    "Mixue Sogo": 0,
                                  });
                                }
                                const dateEntry = dateMap.get(dateKey);
                                dateEntry[store.name] = dayData.total_sales;
                                storeTotals[store.name] += dayData.total_sales;
                              });
                            }
                          });
                        }
                      });

                      // Convert map to sorted array
                      const sortedDates = Array.from(dateMap.values()).sort(
                        (a, b) => new Date(a.date) - new Date(b.date),
                      );

                      const visibleTotal = Object.entries(storeTotals)
                        .filter(([cafe]) => visibleCafes[cafe])
                        .reduce((sum, [, val]) => sum + val, 0);

                      return (
                        <>
                          {sortedDates.map((row) => {
                            const dailyTotal = Object.entries(row)
                              .filter(
                                ([key]) => key !== "date" && visibleCafes[key],
                              )
                              .reduce((sum, [, val]) => sum + val, 0);

                            return (
                              <tr key={row.date}>
                                <td
                                  style={{
                                    border: "1px solid #ddd",
                                    padding: "12px",
                                    textAlign: "left",
                                    fontWeight: "500",
                                  }}
                                >
                                  {new Date(row.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </td>
                                {visibleCafes.Mixue && (
                                  <td
                                    style={{
                                      border: "1px solid #ddd",
                                      padding: "12px",
                                      textAlign: "right",
                                    }}
                                  >
                                    {formatCurrency(row.Mixue)}
                                  </td>
                                )}
                                {visibleCafes["Aby Yus"] && (
                                  <td
                                    style={{
                                      border: "1px solid #ddd",
                                      padding: "12px",
                                      textAlign: "right",
                                    }}
                                  >
                                    {formatCurrency(row["Aby Yus"])}
                                  </td>
                                )}
                                {visibleCafes["D' Amazon Café"] && (
                                  <td
                                    style={{
                                      border: "1px solid #ddd",
                                      padding: "12px",
                                      textAlign: "right",
                                    }}
                                  >
                                    {formatCurrency(row["D' Amazon Café"])}
                                  </td>
                                )}
                                {visibleCafes["Ojim Café"] && (
                                  <td
                                    style={{
                                      border: "1px solid #ddd",
                                      padding: "12px",
                                      textAlign: "right",
                                    }}
                                  >
                                    {formatCurrency(row["Ojim Café"])}
                                  </td>
                                )}
                                {visibleCafes["D' Amazon Café LYP"] && (
                                  <td
                                    style={{
                                      border: "1px solid #ddd",
                                      padding: "12px",
                                      textAlign: "right",
                                    }}
                                  >
                                    {formatCurrency(row["D' Amazon Café LYP"])}
                                  </td>
                                )}
                                {visibleCafes["Mixue Sogo"] && (
                                  <td
                                    style={{
                                      border: "1px solid #ddd",
                                      padding: "12px",
                                      textAlign: "right",
                                    }}
                                  >
                                    {formatCurrency(row["Mixue Sogo"])}
                                  </td>
                                )}
                                <td
                                  style={{
                                    border: "1px solid #ddd",
                                    padding: "12px",
                                    textAlign: "right",
                                    backgroundColor: "#d4edda",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {formatCurrency(dailyTotal)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{ backgroundColor: "#e8f5e8" }}>
                            <td
                              style={{
                                border: "1px solid #ddd",
                                padding: "12px",
                                textAlign: "left",
                                fontWeight: "bold",
                              }}
                            >
                              TOTAL
                            </td>
                            {visibleCafes.Mixue && (
                              <td
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "12px",
                                  textAlign: "right",
                                  fontWeight: "bold",
                                }}
                              >
                                {formatCurrency(storeTotals.Mixue)}
                              </td>
                            )}
                            {visibleCafes["Aby Yus"] && (
                              <td
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "12px",
                                  textAlign: "right",
                                  fontWeight: "bold",
                                }}
                              >
                                {formatCurrency(storeTotals["Aby Yus"])}
                              </td>
                            )}
                            {visibleCafes["D' Amazon Café"] && (
                              <td
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "12px",
                                  textAlign: "right",
                                  fontWeight: "bold",
                                }}
                              >
                                {formatCurrency(storeTotals["D' Amazon Café"])}
                              </td>
                            )}
                            {visibleCafes["Ojim Café"] && (
                              <td
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "12px",
                                  textAlign: "right",
                                  fontWeight: "bold",
                                }}
                              >
                                {formatCurrency(storeTotals["Ojim Café"])}
                              </td>
                            )}
                            {visibleCafes["D' Amazon Café LYP"] && (
                              <td
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "12px",
                                  textAlign: "right",
                                  fontWeight: "bold",
                                }}
                              >
                                {formatCurrency(
                                  storeTotals["D' Amazon Café LYP"],
                                )}
                              </td>
                            )}
                            {visibleCafes["Mixue Sogo"] && (
                              <td
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "12px",
                                  textAlign: "right",
                                  fontWeight: "bold",
                                }}
                              >
                                {formatCurrency(storeTotals["Mixue Sogo"])}
                              </td>
                            )}
                            <td
                              style={{
                                border: "1px solid #ddd",
                                padding: "12px",
                                textAlign: "right",
                                backgroundColor: "#d4edda",
                                fontWeight: "bold",
                              }}
                            >
                              {formatCurrency(visibleTotal)}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Stock Purchase Estimator Tab */}
          {activeTab === "stock_estimator" && (
            <div style={{ padding: "16px" }}>
              <StockPurchaseEstimator month={selectedMonths} year={selectedYear} />
            </div>
          )}

          {/* time sheet  Tab brand and staff */}
          {activeTab === "timesheet_summary" && (
            <TimesheetSB month={selectedMonths} year={selectedYear} />
          )}

          {/* Salary Summary Tab */}
          {activeTab === "salary_summary" && (
            <SalarySummary month={selectedMonths} year={selectedYear} />
          )}

          {/* time sheet  Tab brand and staff */}
          {activeTab === "monthly_sales_summary" && (
            <MonthSalesSummary mon={selectedMonths} year={selectedYear} />
          )}

          {/* Monthly Salary Tab */}
          {activeTab === "monthly_salary" && (
            <MonthlySalary month={selectedMonths} year={selectedYear} />
          )}

          {/* Trends Tab */}
          {activeTab === "trends" && chartData.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "32px" }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "24px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  Revenue Trends
                </h3>
                <div className="row">
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines1.Mixue}
                        onChange={() => handleToggle1("Mixue")}
                      />
                      Mixue
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines1.AbyYus}
                        onChange={() => handleToggle1("AbyYus")}
                      />
                      Aby Yus
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines1.Amazon}
                        onChange={() => handleToggle1("Amazon")}
                      />
                      D' Amazon Café
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines1.Ojim}
                        onChange={() => handleToggle1("Ojim")}
                      />
                      Ojim Café
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines1.AmazonLYP}
                        onChange={() => handleToggle1("AmazonLYP")}
                      />
                      D' Amazon Café LYP
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines1.MixueSogo}
                        onChange={() => handleToggle1("MixueSogo")}
                      />
                      Mixue Sogo
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines1.SDS}
                        onChange={() => handleToggle1("SDS")}
                      />
                      SDS
                    </label>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      tickFormatter={(value) =>
                        `RM${(value / 1000).toFixed(0)}K`
                      }
                    />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    {visibleLines1.Mixue && (
                      <Line
                        type="monotone"
                        dataKey="Mixue_actual"
                        stroke="#8884d8"
                        strokeWidth={3}
                        name="Mixue"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines1.AbyYus && (
                      <Line
                        type="monotone"
                        dataKey="Aby Yus_actual"
                        stroke="#82ca9d"
                        strokeWidth={3}
                        name="Aby Yus"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines1.Amazon && (
                      <Line
                        type="monotone"
                        dataKey="D' Amazon Café_actual"
                        stroke="#ffc658"
                        strokeWidth={3}
                        name="D' Amazon Café"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines1.Ojim && (
                      <Line
                        type="monotone"
                        dataKey="Ojim Café_actual"
                        stroke="#d4edda"
                        strokeWidth={3}
                        name="Ojim Café"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines1.AmazonLYP && (
                      <Line
                        type="monotone"
                        dataKey="D' Amazon Café LYP_actual"
                        stroke="#e8536f"
                        strokeWidth={3}
                        name="D' Amazon Café LYP"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines1.MixueSogo && (
                      <Line
                        type="monotone"
                        dataKey="Mixue Sogo_actual"
                        stroke="#c084fc"
                        strokeWidth={3}
                        name="Mixue Sogo"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines1.SDS && (
                      <Line
                        type="monotone"
                        dataKey="SDS_actual"
                        stroke="#ff7300"
                        strokeWidth={3}
                        name="SDS Total"
                        connectNulls={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  padding: "24px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  Profit Trends
                </h3>
                <div className="row">
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines.Mixue}
                        onChange={() => handleToggle("Mixue")}
                      />
                      Mixue
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines.AbyYus}
                        onChange={() => handleToggle("AbyYus")}
                      />
                      Aby Yus
                    </label>
                  </div>
                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines.Amazon}
                        onChange={() => handleToggle("Amazon")}
                      />
                      D' Amazon Café
                    </label>
                  </div>

                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines.Ojim}
                        onChange={() => handleToggle("Ojim")}
                      />
                      Ojim Café
                    </label>
                  </div>

                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines.AmazonLYP}
                        onChange={() => handleToggle("AmazonLYP")}
                      />
                      D' Amazon Café LYP
                    </label>
                  </div>

                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines.MixueSogo}
                        onChange={() => handleToggle("MixueSogo")}
                      />
                      Mixue Sogo
                    </label>
                  </div>

                  <div className="col-md-2">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleLines.SDS}
                        onChange={() => handleToggle("SDS")}
                      />
                      SDS
                    </label>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      tickFormatter={(value) =>
                        `RM${(value / 1000).toFixed(0)}K`
                      }
                    />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    {visibleLines.Mixue && (
                      <Line
                        type="monotone"
                        dataKey="Mixue_profit"
                        stroke="#8884d8"
                        strokeWidth={3}
                        name="Mixue Profit"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines.AbyYus && (
                      <Line
                        type="monotone"
                        dataKey="Aby Yus_profit"
                        stroke="#82ca9d"
                        strokeWidth={3}
                        name="Aby Yus Profit"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines.Amazon && (
                      <Line
                        type="monotone"
                        dataKey="D' Amazon Café_profit"
                        stroke="#ffc658"
                        strokeWidth={3}
                        name="D' Amazon Café Profit"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines.Ojim && (
                      <Line
                        type="monotone"
                        dataKey="Ojim Café_profit"
                        stroke="#d4edda"
                        strokeWidth={3}
                        name="Ojim Café Profit"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines.AmazonLYP && (
                      <Line
                        type="monotone"
                        dataKey="D' Amazon Café LYP_profit"
                        stroke="#e8536f"
                        strokeWidth={3}
                        name="D' Amazon Café LYP Profit"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines.MixueSogo && (
                      <Line
                        type="monotone"
                        dataKey="Mixue Sogo_profit"
                        stroke="#c084fc"
                        strokeWidth={3}
                        name="Mixue Sogo Profit"
                        connectNulls={false}
                      />
                    )}
                    {visibleLines.SDS && (
                      <Line
                        type="monotone"
                        dataKey="SDS_profit"
                        stroke="#ff7300"
                        strokeWidth={3}
                        name="SDS Total Profit"
                        connectNulls={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {/* Store Comparison Tab */}
          {activeTab === "comparison" && chartData.length > 0 && (
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h3
                style={{
                  marginBottom: "16px",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                Store Performance Comparison
              </h3>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => `RM${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Mixue_actual" fill="#8884d8" name="Mixue" />
                  <Bar dataKey="Aby Yus_actual" fill="#82ca9d" name="Aby Yus" />
                  <Bar
                    dataKey="D' Amazon Café_actual"
                    fill="#ffc658"
                    name="D' Amazon Café"
                  />
                  <Bar
                    dataKey="Ojim Café_actual"
                    fill="#d6dc35ff"
                    name="Ojim Café"
                  />
                  <Bar
                    dataKey="D' Amazon Café LYP_actual"
                    fill="#e8536f"
                    name="D' Amazon Café LYP"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Revenue Distribution Tab */}
          {activeTab === "distribution" && pieData.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "24px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  Revenue Distribution
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "normal",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    Combined data from {selectedMonths.length} month
                    {selectedMonths.length !== 1 ? "s" : ""}
                  </div>
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  padding: "24px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  Revenue Summary
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {pieData.map((store, index) => {
                    const percentage =
                      pieData.length > 0
                        ? (store.value /
                            pieData.reduce((sum, s) => sum + s.value, 0)) *
                          100
                        : 0;
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          borderLeft: `4px solid ${store.color}`,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "500" }}>{store.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {percentage.toFixed(1)}% of total
                          </div>
                        </div>
                        <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                          {formatCurrency(store.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  padding: "24px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  Profit
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "normal",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    Combined data from {selectedMonths.length} month
                    {selectedMonths.length !== 1 ? "s" : ""}
                  </div>
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieData1}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData1.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  padding: "24px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  Profit Summary
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {pieData1.map((store, index) => {
                    const percentage =
                      pieData1.length > 0
                        ? (store.value /
                            pieData1.reduce((sum, s) => sum + s.value, 0)) *
                          100
                        : 0;
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          borderLeft: `4px solid ${store.color}`,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "500" }}>{store.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {percentage.toFixed(1)}% of total
                          </div>
                        </div>
                        <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                          {formatCurrency(store.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* <div
        style={{
          marginTop: "32px",
          fontSize: "14px",
          color: "#666",
          backgroundColor: "#f8f9fa",
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        <p>
          <strong>Legend:</strong>
        </p>
        <p>• Total Sales/Actual/Expenses = Sum of all selected months</p>
        <p>• % Cost = (Total Expenses / Total Actual) × 100</p>
        <p>• Profit = Total Actual - Total Expenses</p>
        <p>• % Profit = (Profit / Total Actual) × 100</p>
        <p>
          • Revenue Distribution shows combined data from all selected months
        </p>
      </div> */}
    </div>
  );
}

export default MTDSummary;
