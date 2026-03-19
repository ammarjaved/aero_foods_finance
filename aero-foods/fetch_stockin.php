<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "aero_foods_finance";
$user = "postgres";
$pass = "Admin123";

$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Fetch data from permit_records table
$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$m=$_GET['month'];
// Fetch data from permit_records table
$query = "SELECT 
    name,
    SUM(transaction_in) AS stock_in,
    SUM(unit_price * transaction_in) AS total_value,  -- Calculate value per row then sum
    month_date
    month_date
FROM stock_in_transaction 
WHERE EXTRACT(MONTH FROM created_at) = $m  
GROUP BY name,month_date 
ORDER BY month_date DESC";

$stmt = $conn->prepare($query);
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Return JSON response
echo json_encode($data);
?>