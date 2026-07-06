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
$db = "amazon_cafe_finance_lyp";
$user = "postgres";
$pass = "Admin123";
$conn = new PDO("pgsql:host=$host;dbname=$db", $user, $pass);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Parse the target data from request
        $data = json_decode(file_get_contents('php://input'), true);
		
		
        // Check if required data is provided
        if (isset($data['name']) && isset($data['date'])) {
            $targetName = $data['name']; // Remove intval() since name is likely a string
            $targetDate = $data['date']; // Keep as string or convert appropriately based on your date format
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: name and date']);
            exit;
        }
        
        // Delete the target records from both tables
        $deleteStmt = $conn->prepare("DELETE FROM stock_in WHERE name = ? AND month_date = ?");
        $deleteStmt1 = $conn->prepare("DELETE FROM stock_in_transaction WHERE name = ? AND month_date = ?");
        
        $result = $deleteStmt->execute([$targetName, $targetDate]);
        $result1 = $deleteStmt1->execute([$targetName, $targetDate]);
        
        // Check if at least one record was deleted from either table
        if (($result && $deleteStmt->rowCount() > 0) || ($result1 && $deleteStmt1->rowCount() > 0)) {
            echo json_encode([
                'success' => true,
                'message' => 'Target record(s) deleted successfully',
                'name' => $targetName,
                'date' => $targetDate,
                'deleted_from_stock_in' => $deleteStmt->rowCount(),
                'deleted_from_stock_in_transaction' => $deleteStmt1->rowCount()
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No target records found with the specified name and date']);
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use DELETE method.']);
}
?>