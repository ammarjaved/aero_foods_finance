<?php
// delete_target.php - Delete target record
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include database connection
$host = "192.168.1.34";
$db = "aero_foods_finance";
$user = "postgres";
$pass = "Admin123";

$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        // Parse the target ID from request
        $data = json_decode(file_get_contents('php://input'), true);
        
        // If ID is provided directly in URL
        if (isset($_GET['id'])) {
            $targetId = intval($_GET['id']);
        } 
        // If ID is provided in request body
        elseif (isset($data['id'])) {
            $targetId = intval($data['id']);
        }
        else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing target identifier (id or month/year)']);
            exit;
        }
        
        // Delete the target record
      
        $deleteStmt = $conn->prepare("DELETE FROM log_sheet WHERE id = ?");
        $result = $deleteStmt->execute([$targetId]);
        if ($result && $deleteStmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Target record deleted successfully',
                'id' => $targetId
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Target record not found or already deleted']);
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use DELETE method.']);
}
?>