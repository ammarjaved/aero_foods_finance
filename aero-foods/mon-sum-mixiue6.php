<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "amazon_cafe_finance_lyp";
$user = "postgres";
$pass = "Admin123";

$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$m = $_GET['month'];
$y = $_GET['year'];

// Monthly data query
$query = "SELECT 
    brs.month_date,
    COALESCE(SUM(brs.total_sales), 0) AS total_sales,
    COALESCE(SUM(brs.actual_total), 0) AS total_actual,
    ROUND((COALESCE(SUM(brs.actual_total), 0) - COALESCE(SUM(brs.total_sales), 0))::numeric, 2) AS total_variance,
    (SELECT ROUND(COALESCE(SUM(de.amount), 0)::numeric, 2) 
     FROM daily_expenditure de 
     WHERE de.month_date = brs.month_date) AS total_expense,
    (SELECT ds.cash_box_amount 
     FROM daily_sheet ds 
     WHERE ds.month_date = brs.month_date 
     LIMIT 1) AS cash_box
FROM bank_reconciliation_sheet brs
WHERE EXTRACT(MONTH FROM brs.month_date) = $m 
  AND EXTRACT(YEAR FROM brs.month_date) = $y
GROUP BY brs.month_date
ORDER BY brs.month_date;";

$stmt = $conn->prepare($query);
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Overall stats query
$overallQuery = "SELECT 
    COALESCE(ROUND(SUM(brs.actual_total)::numeric, 2), 0) AS overall_actual,
    COALESCE(ROUND(SUM(
        (SELECT COALESCE(SUM(de.amount), 0) 
         FROM daily_expenditure de 
         WHERE de.month_date = brs.month_date)
    )::numeric, 2), 0) AS overall_expense
FROM bank_reconciliation_sheet brs 
WHERE EXTRACT(YEAR FROM brs.month_date) <= $y";

$overallStmt = $conn->prepare($overallQuery);
$overallStmt->execute();
$overallData = $overallStmt->fetch(PDO::FETCH_ASSOC);

// Calculate overall profit safely
$overallActual  = is_numeric($overallData['overall_actual'])  ? (float)$overallData['overall_actual']  : 0;
$overallExpense = is_numeric($overallData['overall_expense']) ? (float)$overallData['overall_expense'] : 0;

$overallProfit = $overallActual - $overallExpense;
$overallProfitPercentage = $overallActual > 0 
    ? ($overallProfit / $overallActual) * 100 
    : 0;

// Build response
$response = [
    'monthly_data' => $data,
    'overall_stats' => [
        'overall_actual'             => $overallData['overall_actual'],
        'overall_expense'            => $overallData['overall_expense'],
        'overall_profit'             => round($overallProfit, 2),
        'overall_profit_percentage'  => round($overallProfitPercentage, 2)
    ]
];

echo json_encode($response);
?>