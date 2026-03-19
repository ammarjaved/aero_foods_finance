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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Database connection - PostgreSQL
$host = '192.168.1.34';
$dbname = 'aero_foods_finance';
$username = 'postgres';
$password = 'Admin123';
$port = '5432'; // Default PostgreSQL port

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

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON input',
        'raw' => $rawInput // 🔍 helpful for debugging
    ]);
    exit;
}

// Extract audit metadata
$auditId   = $input['audit_id']   ?? null;
$auditDate = $input['audit_date'] ?? date('Y-m-d');
$auditData = $input['audit_data'] ?? [];

if (empty($auditData) || !is_array($auditData)) {
    http_response_code(400);
    echo json_encode(['error' => 'No audit data provided']);
    exit;
}

// Create images directory if it doesn't exist
$imageDir = 'audit_images/';
if (!file_exists($imageDir)) {
    mkdir($imageDir, 0777, true);
}

// Function to get audit_status_id from audit_status table
function getAuditStatusId($pdo, $statusName) {
    $stmt = $pdo->prepare("SELECT audit_status_id FROM audit_status WHERE LOWER(audit_status_name) = LOWER(?)");
    $stmt->execute([$statusName]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        $insertStmt = $pdo->prepare("INSERT INTO audit_status (audit_status_name) VALUES (?) RETURNING audit_status_id");
        $insertStmt->execute([$statusName]);
        $insertResult = $insertStmt->fetch(PDO::FETCH_ASSOC);
        return $insertResult['audit_status_id'];
    }

    return $result['audit_status_id'];
}

// Function to save base64 image
function saveBase64Image($base64Data, $itemId, $imageIndex, $imageDir) {
    if (strpos($base64Data, 'data:image/') === 0) {
        $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
    }

    $imageData = base64_decode($base64Data);
    if ($imageData === false) {
        return null;
    }

    $filename = 'audit_' . $itemId . '_' . $imageIndex . '_' . time() . '.jpg';
    $filepath = $imageDir . $filename;

    if (file_put_contents($filepath, $imageData)) {
        return $filename;
    }

    return null;
}

try {
    $pdo->beginTransaction();

    $savedRows = 0;
    $errors = [];

    // 🔑 Loop through each audit item in audit_data
    foreach ($auditData as $itemKey => $itemData) {
        try {
            // Skip if data is malformed
            if (!isset($itemData['id'], $itemData['id_type'], $itemData['status'])) {
                $errors[] = "Invalid item format for key $itemKey";
                continue;
            }

            // Get audit_status_id
            $statusId = getAuditStatusId($pdo, $itemData['status']);

            // Handle images
            $imagePaths = ['', '', ''];
            if (!empty($itemData['images']) && is_array($itemData['images'])) {
                foreach ($itemData['images'] as $index => $image) {
                    if ($index >= 3) break;
                    $imagePath = saveBase64Image($image['url'] ?? '', $itemData['id'], $index + 1, $imageDir);
                    if ($imagePath) {
                        $imagePaths[$index] = 'audit_images/'.$imagePath;
                    }
                }
            }

            // Insert into audit table
            $stmt = $pdo->prepare("
                INSERT INTO audit (
                    audit_type_id, 
                    audit_items_id, 
                    audit_status_id, 
                    audit_date, 
                    audit_points, 
                    audit_image_1, 
                    audit_image_2, 
                    audit_image_3
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $itemData['id_type'],
                $itemData['id'],
                $statusId,
                $auditDate,
                $itemData['point'] ?? 0,
                $imagePaths[0],
                $imagePaths[1],
                $imagePaths[2]
            ]);

            $savedRows++;

        } catch (Exception $e) {
            $errors[] = "Error saving item {$itemData['id']}: " . $e->getMessage();
        }
    }

    if (!empty($errors)) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'error' => 'Some items failed to save',
            'details' => $errors
        ]);
        exit;
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Audit saved successfully',
        'rows_saved' => $savedRows,
        'audit_date' => $auditDate
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to save audit',
        'message' => $e->getMessage()
    ]);
}
?>
