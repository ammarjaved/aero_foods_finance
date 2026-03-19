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
$user = "postgres";
$password = "Admin123";
$database = "aero_foods_finance";

if (!isset($_GET['year'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Year required']);
    exit;
}

$year = (int) $_GET['year'];

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$database";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $sql = "SELECT * FROM salary WHERE year = :year ORDER BY year";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['year' => $year]);

    echo json_encode([
        'status' => 'success',
        'results' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

?>