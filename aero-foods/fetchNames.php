<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin
header("Content-Type: application/json; charset=UTF-8");

// Database connection
$host = "192.168.1.34";
$db = "aero_foods_finance";
$user = "postgres";
$pass = "Admin123";

try {
    $conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch data from employees table
    $query = "SELECT short_name FROM public.employees WHERE LOWER(COALESCE(is_active, 'yes')) = 'yes' ORDER BY short_name";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_COLUMN); // Fetch as simple array of names

    echo json_encode($data);
} catch (PDOException $e) {
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}
?>
