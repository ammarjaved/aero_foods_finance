<?php
// Enable CORS for React Native / Frontend
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

    // Base query
    $sql = "SELECT id, expense_type_name, need_approval 
            FROM public.expense_types";
    
    $params = [];

    // Check if search parameter exists and is not empty
    if (isset($_GET['search']) && trim($_GET['search']) !== '') {
        $searchTerm = trim($_GET['search']);
        $sql .= " WHERE expense_type_name ILIKE :search";
        $params[':search'] = '%' . $searchTerm . '%';
    }

    // Optional: order consistently
    $sql .= " ORDER BY id ASC";

    // Prepare and execute
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Fetch results
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Success response
    echo json_encode([
        'status' => 'success',
        'message' => count($results) . ' expense type(s) found',
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