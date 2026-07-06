<?php
// Database configuration
$host = "192.168.1.34";
$port = "5432";
$dbname = "ojim_finance";
$username = "postgres";
$password = "Admin123";
// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

// Get JSON input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

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

// Function to handle daily expenditure (insert/update)
function handleDailyExpenditure($data) {
    // Validate input
    if (!$data || !isset($data['username']) || !isset($data['records'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request format. Required: username, records']);
        exit;
    }

    $username_request = $data['username'];
    $records = $data['records'];

    // Upload directory for receipts
    $uploadDir = __DIR__ . '/images/expenditure';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $conn = getConnection();

    try {
        // Start transaction
        $conn->beginTransaction();
        
        $results = [];

        foreach ($records as $record) {
            $isUpdate = !empty($record['id']);

            $updateFields = [];
            $insertColumns = [];
            $insertValues = [];
            $params = [];

            // === Always handled fields ===
            $alwaysFields = [
                'vendor'  => $record['vendor'] ?? '',
                'amount'  => $record['amount'] ?? 0,
                'remarks' => $record['remarks'] ?? '',
                'company' => 'Ojim'
            ];

            foreach ($alwaysFields as $field => $value) {
                if ($isUpdate) {
                    $updateFields[] = "$field = :$field";
                } else {
                    $insertColumns[] = $field;
                    $insertValues[] = ":$field";
                }
                $params[":$field"] = $value;
            }

            // updated_by & updated_at
            if ($isUpdate) {
                $updateFields[] = "updated_by = :updated_by";
                $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
            } else {
                $insertColumns[] = "created_by";
                $insertValues[] = ":created_by";
                $insertColumns[] = "updated_by";
                $insertValues[] = ":updated_by";
                $params[':created_by'] = $username_request;
            }
            $params[':updated_by'] = $username_request;

            // Insert-only fields
            if (!$isUpdate) {
                $insertColumns[] = "month_date";
                $insertValues[] = ":month_date";
                $params[':month_date'] = $record['month_date'] ?? date('Y-m-d');

                $insertColumns[] = "day";
                $insertValues[] = ":day";
                $params[':day'] = $record['day'] ?? 0;
            }

            // === Expense type field ===
            $expenseTypeName = null;
            if (isset($record['expense_type_name'])) {
                $expenseTypeName = $record['expense_type_name'];
                $col = 'expense_type_name';
                if ($isUpdate) {
                    $updateFields[] = "$col = :$col";
                } else {
                    $insertColumns[] = $col;
                    $insertValues[] = ":$col";
                }
                $params[":$col"] = $expenseTypeName;
            }

            // === Approval status field ===
            $shouldSetApproval = false;
            $boolVal = null;
            
            if (array_key_exists('is_approved', $record)) {
                // Explicitly provided - preserve the exact value
                $val = $record['is_approved'];
                
                // Handle null, true/false, 0/1, "0"/"1"
                if ($val === null || $val === '' || $val === 'null') {
                    $boolVal = null; // Keep as pending
                } else if ($val === true || $val === 1 || $val === '1' || $val === 'true') {
                    $boolVal = true; // Approved
                } else if ($val === false || $val === 0 || $val === '0' || $val === 'false') {
                    $boolVal = false; // Rejected
                } else {
                    $boolVal = null; // Default to pending for unknown values
                }
                $shouldSetApproval = true;
            } else if (!$isUpdate) {
                // Auto-set only for NEW records based on expense type
                if ($expenseTypeName === 'Claim') {
                    $boolVal = false; // FALSE for claims (not approved)
                } else {
                    $boolVal = true; // TRUE for non-claims (auto-approved)
                }
                $shouldSetApproval = true;
            }
            // For updates without is_approved field, don't modify it

            if ($shouldSetApproval) {
                $col = 'is_approved';
                if ($isUpdate) {
                    $updateFields[] = "$col = :$col";
                } else {
                    $insertColumns[] = $col;
                    $insertValues[] = ":$col";
                }
                $params[":$col"] = ($boolVal === null) ? null : ($boolVal ? 1 : 0);
            }

            // === Expense receipt image handling ===
            if (isset($record['expense_recipt']) && $record['expense_recipt'] !== "" && $record['expense_recipt'] !== null) {
                $dataUrl = $record['expense_recipt'];
                $isBase64 = false;

                if (strpos($dataUrl, "data:image") === 0) {
                    $isBase64 = true;
                } else if (strlen($dataUrl) > 100 && strpos($dataUrl, "/") === false) {
                    $isBase64 = true;
                }

                if ($isBase64) {
                    if (preg_match('#^data:image/(\w+);base64,(.*)$#', $dataUrl, $match)) {
                        $extension = strtolower($match[1]);
                        $base64 = $match[2];
                    } else {
                        $extension = 'jpg';
                        $base64 = $dataUrl;
                    }

                    $imageData = base64_decode($base64);
                    if ($imageData === false) {
                        throw new Exception("Invalid base64 image data");
                    }

                    $guid = bin2hex(random_bytes(16));
                    $filename = $guid . '.' . $extension;
                    $fullPath = $uploadDir . '/' . $filename;

                    if (file_put_contents($fullPath, $imageData) === false) {
                        throw new Exception("Failed to save receipt image");
                    }

                    $dbPath = 'images/expenditure/' . $filename;
                } else {
                    $dbPath = $dataUrl;
                }

                $col = 'expense_recipt';
                if ($isUpdate) {
                    $updateFields[] = "$col = :$col";
                } else {
                    $insertColumns[] = $col;
                    $insertValues[] = ":$col";
                }
                $params[":$col"] = $dbPath;
            }
            
            // === Build and execute query ===
            if ($isUpdate) {
                $sql = "UPDATE public.daily_expenditure SET " . implode(', ', $updateFields) . " WHERE id = :id RETURNING *";
                $params[':id'] = $record['id'];
            } else {
                $sql = "INSERT INTO public.daily_expenditure (" . implode(', ', $insertColumns) . ") VALUES (" . implode(', ', $insertValues) . ") RETURNING *";
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
            'message' => 'Daily expenditure data processed successfully',
            'results' => $results
        ]);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            'error' => $e->getMessage()
        ]);
    }

    $conn = null;
}

// Function to handle approval updates
function handleApprovalUpdate($data) {
    // Validate input
    if (!$data || !isset($data['id']) || !isset($data['is_approved']) || !isset($data['username'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request format. Required: id, is_approved, username']);
        exit;
    }

    $recordId = $data['id'];
    $isApproved = $data['is_approved'];
    $username_request = $data['username'];

    // Convert is_approved to boolean
    $boolVal = filter_var($isApproved, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($boolVal === null) {
        $boolVal = false;
    }

    $conn = getConnection();

    try {
        // Start transaction
        $conn->beginTransaction();
        
        // Update the approval status
        $sql = "UPDATE public.daily_expenditure 
                SET is_approved = :is_approved, 
                    updated_by = :updated_by, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = :id 
                RETURNING *";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':is_approved' => $boolVal ? 1 : 0,
            ':updated_by' => $username_request,
            ':id' => $recordId
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            throw new Exception("Record not found with ID: $recordId");
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Approval status updated successfully',
            'record' => $result
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

// Route based on action parameter
if (!isset($data['action'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing action parameter. Use "save" or "approve"']);
    exit;
}

switch ($data['action']) {
    case 'save':
        handleDailyExpenditure($data);
        break;
    
    case 'approve':
        handleApprovalUpdate($data);
        break;
    
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action. Use "save" or "approve"']);
        break;
}
?>