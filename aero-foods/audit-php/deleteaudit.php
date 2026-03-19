<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400"); // 24 hours
    http_response_code(200);
    exit();
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use DELETE or POST method.']);
    exit;
}

// Database connection - PostgreSQL
$host = '192.168.1.34';
$dbname = 'aero_foods_finance';
$username = 'postgres';
$password = 'Admin123';
$port = '5432';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Get JSON input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

//echo $input['audit_date'];
//exit();
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON input',
        'raw' => $rawInput
    ]);
    exit;
}

// Extract deletion criteria
$auditDate = $input['audit_date'] ?? null; // Delete by date

if (empty($auditDate)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'audit_date is required',
        'example' => ['audit_date' => '2025-10-08']
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Delete records from audit table
    $deleteStmt = $pdo->prepare("DELETE FROM audit WHERE audit_date='$auditDate'");
    $deleteStmt->execute();
    $deletedRows = $deleteStmt->rowCount();

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Audit records deleted successfully',
        'deleted_count' => $deletedRows
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to delete audit records',
        'message' => $e->getMessage()
    ]);
}
?>