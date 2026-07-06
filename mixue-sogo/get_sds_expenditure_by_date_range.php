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
$dbname = "mixue_sogo";
$user = "postgres";
$password = "Admin123";

try {
    // Connect to PostgreSQL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get date range from query parameters
    $start_date = $_GET['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? null;
    if (!$start_date || !$end_date) {
        throw new Exception("start_date and end_date parameters are required");
    }

    // Validate date formats
    if (!DateTime::createFromFormat('Y-m-d', $start_date) || !DateTime::createFromFormat('Y-m-d', $end_date)) {
        throw new Exception("Invalid date format. Use YYYY-MM-DD");
    }

    // Prepare and execute SELECT query
    $sql = "SELECT * FROM public.sds_expenditure WHERE month_date BETWEEN :start_date AND :end_date ORDER BY month_date DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':start_date' => $start_date, ':end_date' => $end_date]);

    // Fetch all results
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Return results as JSON
    echo json_encode([
        'status' => 'success',
        'message' => count($results) . ' records retrieved between ' . $start_date . ' and ' . $end_date,
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