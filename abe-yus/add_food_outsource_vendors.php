<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
$dbname = "abe_yus_finance";
$user = "postgres";
$password = "Admin123";

try {
    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data) {
        throw new Exception("Invalid JSON input");
    }

    // Validate required fields
    if (!isset($data['vendor_name']) || empty(trim($data['vendor_name']))) {
        throw new Exception("vendor_name is required");
    }

    // Connect to PostgreSQL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "INSERT INTO public.food_outsource_vendors (
        vendor_name, created_by, updated_by
    ) VALUES (
        :vendor_name, :created_by, :updated_by
    ) RETURNING id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':vendor_name' => trim($data['vendor_name']),
        ':created_by' => $data['created_by'] ?? '',
        ':updated_by' => $data['updated_by'] ?? ''
    ]);

    $id = $stmt->fetchColumn();

    echo json_encode([
        'status' => 'success',
        'message' => 'Vendor added successfully',
        'id' => $id
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