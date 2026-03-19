<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "amazon_cafe_finance";
$user = "postgres";
$pass = "Admin123";

$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Fetch data from permit_records table
$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$m=$_GET['month'];
$y=$_GET['year'];
// Fetch data from permit_records table
$query = "SELECT 
    brs.month_date,
    SUM(brs.total_sales) AS total_sales,
    SUM(brs.actual_total) AS total_actual,
    ROUND((SUM(brs.actual_total) - SUM(brs.total_sales))::numeric, 2) AS total_variance,
    (SELECT ROUND(SUM(de.amount)::numeric, 2) 
     FROM daily_expenditure de 
     WHERE de.month_date = brs.month_date) AS total_expense,
    (SELECT ds.cash_box_amount 
     FROM daily_sheet ds 
     WHERE ds.month_date = brs.month_date 
     LIMIT 1) AS cash_box
FROM bank_reconciliation_sheet brs
WHERE EXTRACT(MONTH FROM brs.month_date) = $m and EXTRACT(YEAR FROM brs.month_date)=$y
GROUP BY brs.month_date
ORDER BY brs.month_date;";

$stmt = $conn->prepare($query);
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);
$overallQuery = "SELECT 
    ROUND(SUM(brs.actual_total)::numeric, 2) AS overall_actual,
    ROUND(SUM(
        (SELECT COALESCE(SUM(de.amount), 0) 
         FROM daily_expenditure de 
         WHERE de.month_date = brs.month_date)
    )::numeric, 2) AS overall_expense
FROM bank_reconciliation_sheet brs WHERE EXTRACT(YEAR FROM brs.month_date) <= $y";

$overallStmt = $conn->prepare($overallQuery);
$overallStmt->execute();
$overallData = $overallStmt->fetch(PDO::FETCH_ASSOC);

// Calculate overall profit
$overallProfit = $overallData['overall_actual'] - $overallData['overall_expense'];
$overallProfitPercentage = $overallData['overall_actual'] > 0 
    ? ($overallProfit / $overallData['overall_actual']) * 100 
    : 0;

// Add overall data to response
$response = [
    'monthly_data' => $data,
    'overall_stats' => [
        'overall_actual' => $overallData['overall_actual'],
        'overall_expense' => $overallData['overall_expense'],
        'overall_profit' => round($overallProfit, 2),
        'overall_profit_percentage' => round($overallProfitPercentage, 2)
    ]
];

echo json_encode($response);
?>