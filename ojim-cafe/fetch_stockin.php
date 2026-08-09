<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "ojim_finance";
$user = "postgres";
$pass = "Admin123";

$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Fetch data from permit_records table
$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$m = isset($_GET['month']) && $_GET['month'] !== "" ? (int) $_GET['month'] : (int) date('n');
$y = isset($_GET['year']) && $_GET['year'] !== "" ? (int) $_GET['year'] : (int) date('Y');
// Filter on month_date (the sheet date of the stock-in), not created_at (the row's
// insert timestamp) -- a June entry backdated to April belongs in April. Always scope
// to a year as well, otherwise June 2025 shows up alongside June of the current year.
$query = "SELECT
    name,
    SUM(transaction_in) AS stock_in,
    SUM(unit_price * transaction_in) AS total_value,  -- Calculate value per row then sum
    month_date
FROM stock_in_transaction
WHERE EXTRACT(MONTH FROM month_date) = :month
  AND EXTRACT(YEAR FROM month_date) = :year
GROUP BY name,month_date
ORDER BY month_date DESC";

$stmt = $conn->prepare($query);
$stmt->execute([':month' => $m, ':year' => $y]);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Return JSON response
echo json_encode($data);
?>