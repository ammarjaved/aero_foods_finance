<?php
// delete_daily_expenditure.php
// Database configuration
$host = "192.168.1.34";
$port = "5432";
$dbname = "aero_foods_finance";
$username = "postgres";
$password = "Admin123";

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Only DELETE method is allowed']);
    exit;
}

// Get JSON input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validate input
if (!$data || !isset($data['id']) || empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Record ID is required']);
    exit;
}

$record_id = $data['id'];

// Connect to PostgreSQL
try {
    $conn_string = "pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password";
    $conn = new PDO($conn_string);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

try {
    // Start transaction
    $conn->beginTransaction();
    
    // First, check if the record exists
    $check_sql = "SELECT id, vendor, amount FROM daily_expenditure WHERE id = :id";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
    $check_stmt->execute();
    
    $record = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        http_response_code(404);
        echo json_encode(['error' => 'Record not found']);
        exit;
    }
    
    // Delete the record
    $delete_sql = "DELETE FROM daily_expenditure WHERE id = :id";
    $delete_stmt = $conn->prepare($delete_sql);
    $delete_stmt->bindValue(':id', $record_id, PDO::PARAM_INT);
    
    $deleted = $delete_stmt->execute();
    
    if ($deleted && $delete_stmt->rowCount() > 0) {
        // Commit transaction
        $conn->commit();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Record deleted successfully',
            'deleted_record' => [
                'id' => $record['id'],
                'vendor' => $record['vendor'],
                'amount' => $record['amount']
            ]
        ]);
    } else {
        throw new Exception('Failed to delete record');
    }
    
} catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

$conn = null;
?>