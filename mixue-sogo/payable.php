<?php
// Database configuration
$host = "192.168.1.34";
$port = "5432";
$dbname = "mixue_sogo";
$username = "postgres";
$password = "Admin123";

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

// Connect to PostgreSQL
function getConnection() {
    global $host, $port, $dbname, $username, $password;
    try {
        $conn_string = "pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password";
        $conn = new PDO($conn_string);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit;
    }
}

// Function to get all payment records
function getAllPayments() {
    $conn = getConnection();

    try {
        // Get all payment records ordered by date descending (newest first)
        $sql = "SELECT * FROM public.payable ORDER BY date DESC, id DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'count' => count($results),
            'results' => $results
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }

    $conn = null;
}

// Function to handle payment records (insert/update)
function savePaymentRecords($data) {
    // Validate input - data should be an array of records
    if (!is_array($data) || empty($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request format. Expected array of payment records']);
        exit;
    }

    $conn = getConnection();

    try {
        // Start transaction
        $conn->beginTransaction();
        
        $results = [];

        foreach ($data as $record) {
            $isUpdate = !empty($record['id']);

            $updateFields = [];
            $insertColumns = [];
            $insertValues = [];
            $params = [];

            // === Required fields for payment records ===
            $requiredFields = [
                'company' => $record['company'] ?? '',
                'payment_to' => $record['payment_to'] ?? '',
                'payment_details' => $record['payment_details'] ?? '',
                'due_amount' => $record['due_amount'] ?? 0,
                'payment_due_date' => $record['payment_due_date'] ?? null,
                'payment_type' => $record['payment_type'] ?? '',
                'payment_status' => $record['payment_status'] ?? 'Pending'
            ];

            // Validate required fields
            if (empty($requiredFields['company'])) {
                throw new Exception("Company is required");
            }
            if (empty($requiredFields['payment_to'])) {
                throw new Exception("Payment To is required");
            }
            if ($requiredFields['due_amount'] <= 0) {
                throw new Exception("Due Amount must be greater than 0");
            }

            // Add fields to query
            foreach ($requiredFields as $field => $value) {
                if ($isUpdate) {
                    $updateFields[] = "$field = :$field";
                } else {
                    $insertColumns[] = $field;
                    $insertValues[] = ":$field";
                }
                $params[":$field"] = $value;
            }

            // Handle date field (auto-inserted for new records, not updated)
            if (!$isUpdate) {
                $insertColumns[] = "date";
                $insertValues[] = "CURRENT_TIMESTAMP";
            }

            // === Build and execute query ===
            if ($isUpdate) {
                $sql = "UPDATE public.payable SET " . implode(', ', $updateFields) . " WHERE id = :id RETURNING *";
                $params[':id'] = $record['id'];
            } else {
                $sql = "INSERT INTO public.payable (" . implode(', ', $insertColumns) . ") VALUES (" . implode(', ', $insertValues) . ") RETURNING *";
            }

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $results[] = $result;
        }

        // Commit transaction
        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => count($results) . ' payment record(s) processed successfully',
            'results' => $results
        ]);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }

    $conn = null;
}

// Function to delete a payment record
function deletePayment($data) {
    // Validate input
    if (!$data || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required field: id']);
        exit;
    }

    $recordId = $data['id'];
    $conn = getConnection();

    try {
        // Start transaction
        $conn->beginTransaction();
        
        // Check if record exists
        $checkSql = "SELECT id FROM public.payable WHERE id = :id";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->execute([':id' => $recordId]);
        
        if (!$checkStmt->fetch()) {
            throw new Exception("Record not found with ID: $recordId");
        }
        
        // Delete the record
        $deleteSql = "DELETE FROM public.payable WHERE id = :id";
        $deleteStmt = $conn->prepare($deleteSql);
        $deleteStmt->execute([':id' => $recordId]);
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Payment record deleted successfully',
            'id' => $recordId
        ]);
        
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'error' => $e->getMessage()
        ]);
    }

    $conn = null;
}

// Route based on request method and action parameter
$requestMethod = $_SERVER['REQUEST_METHOD'];

if ($requestMethod === 'GET') {
    // GET request - retrieve all payments
    getAllPayments();
    
} elseif ($requestMethod === 'POST') {
    // POST request - insert/update payments
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    savePaymentRecords($data);
    
} elseif ($requestMethod === 'DELETE') {
    // DELETE request - delete a payment
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    deletePayment($data);
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>