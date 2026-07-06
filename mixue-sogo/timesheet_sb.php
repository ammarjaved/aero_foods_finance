<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (for development)
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
//$db = "mixue_sogo";
$db=$_GET['db'];
$user = "postgres";
$pass = "Admin123";



// Fetch data from permit_records table
$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$m=$_GET['month'];
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
// Fetch data from permit_records table
$query = "SELECT name,month_date,total_hr FROM public.log_sheet WHERE EXTRACT(MONTH FROM month_date) IN ($m) AND EXTRACT(YEAR FROM month_date) = $year";

$stmt = $conn->prepare($query);
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Return JSON response
echo json_encode($data);
?>