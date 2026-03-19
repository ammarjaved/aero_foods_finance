<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = "192.168.1.34";
$port = "5432";
$dbname = "aero_foods_finance";
$user = "postgres";
$password = "Admin123";

try {
    // Connect to PostgreSQL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get month_date from query parameter
    $month_date = $_GET['month_date'] ?? null;
    if (!$month_date) {
        throw new Exception("month_date parameter is required");
    }

    // Validate date format
    if (!DateTime::createFromFormat('Y-m-d', $month_date)) {
        throw new Exception("Invalid month_date format. Use YYYY-MM-DD");
    }

    // Prepare and execute SELECT query
    $sql = "SELECT * FROM public.sds_expenditure WHERE month_date = :month_date ORDER BY month_date DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':month_date' => $month_date]);

    // Fetch all results
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Return results as JSON
    echo json_encode([
        'status' => 'success',
        'message' => count($results) . ' records retrieved for month_date ' . $month_date,
        'results' => $results
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>