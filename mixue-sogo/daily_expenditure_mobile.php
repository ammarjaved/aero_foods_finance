<?php
// Database configuration
$host = "192.168.1.34";
$port = "5432";
$dbname = "mixue_sogo";
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

// Validate input
if (!$data || !isset($data['username']) || !isset($data['records'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request format']);
    exit;
}

$username_request = $data['username'];
$records = $data['records'];

// Upload directory for receipts
$uploadDir = __DIR__ . '/images/expenditure';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

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
   
    $results = [];
    foreach ($records as $record) {
        $isUpdate = !empty($record['id']);
        $updateFields = [];
        $insertColumns = [];
        $insertValues = [];
        $params = [];

        // === Always handled fields ===
        $alwaysFields = [
            'vendor' => $record['vendor'] ?? '',
            'amount' => $record['amount'] ?? 0,
            'remarks' => $record['remarks'] ?? '',
            'company' => 'Mixue'
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

        // === Optional: expense_type_name ===
        if (isset($record['expense_type_name'])) {
            $col = 'expense_type_name';
            if ($isUpdate) {
                $updateFields[] = "$col = :$col";
            } else {
                $insertColumns[] = $col;
                $insertValues[] = ":$col";
            }
            $params[":$col"] = $record['expense_type_name'];
        }

        // === Handle is_approved with custom logic ===
        $expenseType = $record['expense_type_name'] ?? null;

        if ($isUpdate) {
            // On UPDATE:
            // - If expense_type_name is "Claim" → force is_approved = false
            // - Otherwise → do NOT update is_approved (preserve existing DB value)
            if ($expenseType === 'Claim') {
                $updateFields[] = "is_approved = FALSE";
            }
            // If not "Claim", we intentionally do NOT touch is_approved
        } else {
            // On INSERT:
            // - Default to true, unless expense_type_name is "Claim"
            $isApproved = ($expenseType !== 'Claim');
            $insertColumns[] = "is_approved";
            $insertValues[] = ":is_approved";
            $params[':is_approved'] = $isApproved ? 1 : 0;
        }

        // === Expense receipt image handling ===
        if (isset($record['expense_recipt']) && $record['expense_recipt'] !== "") {
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
                $dbPath = $dataUrl; // existing path
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
?>