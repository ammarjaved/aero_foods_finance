<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
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
$dbname = 'mixue_sogo';
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

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON input',
        'raw' => $rawInput
    ]);
    exit;
}

// Extract audit metadata
$auditDate   = $input['audit_date']   ?? null;
$auditData   = $input['audit_data']   ?? [];
$auditCode   = $input['audit_code']   ?? '';
$auditorName = $input['auditor_name'] ?? '';

if (!$auditDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Audit date is required']);
    exit;
}

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


function getAuditTypeId($pdo, $typeCode) {
    $stmt = $pdo->prepare("SELECT audit_type_id FROM audit_type WHERE LOWER(audit_type_code) = LOWER(?)");
    $stmt->execute([$typeCode]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        $insertStmt = $pdo->prepare("INSERT INTO audit_status (audit_status_name) VALUES (?) RETURNING audit_status_id");
        $insertStmt->execute([$statusName]);
        $insertResult = $insertStmt->fetch(PDO::FETCH_ASSOC);
        return $insertResult['audit_status_id'];
    }

    return $result['audit_type_id'];
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

// Function to delete old images
function deleteOldImages($pdo, $auditDate, $itemId) {
    $stmt = $pdo->prepare("
        SELECT audit_image_1, audit_image_2, audit_image_3 
        FROM audit 
        WHERE audit_date = ? AND audit_items_id = ?
    ");
    $stmt->execute([$auditDate, $itemId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        foreach (['audit_image_1', 'audit_image_2', 'audit_image_3'] as $col) {
            if (!empty($result[$col]) && file_exists($result[$col])) {
                unlink($result[$col]);
            }
        }
    }
}

try {
    $pdo->beginTransaction();

    // First, delete all existing audit records for this date
    $deleteStmt = $pdo->prepare("DELETE FROM audit WHERE audit_date = ?");
    $deleteStmt->execute([$auditDate]);

    $updatedRows = 0;
    $errors = [];

    // Insert updated records
    foreach ($auditData as $itemKey => $itemData) {
        try {
            if (!isset($itemData['id'], $itemData['id_type'], $itemData['status'])) {
                $errors[] = "Invalid item format for key $itemKey";
                continue;
            }

            // Get audit_status_id
            $statusId = getAuditStatusId($pdo, $itemData['status']);
			
			$tId = getAuditTypeId($pdo, $itemData['id_type']);


            // Handle images
            $imagePaths = ['', '', ''];
            if (!empty($itemData['images']) && is_array($itemData['images'])) {
                foreach ($itemData['images'] as $index => $image) {
                    if ($index >= 3) break;
                    
                    // Check if it's an existing image (server path) or new image (base64)
                    if (isset($image['isExisting']) && $image['isExisting'] === true) {
                        // Keep existing image path
                        $imagePaths[$index] = $image['url'];
                    } else {
                        // Save new base64 image
                        $imagePath = saveBase64Image($image['url'] ?? '', $itemData['id'], $index + 1, $imageDir);
                        if ($imagePath) {
                            $imagePaths[$index] = 'audit_images/' . $imagePath;
                        }
                    }
                }
            }
             		  
            // Insert updated record
            $stmt = $pdo->prepare("
                INSERT INTO audit (
                    audit_type_id,
                    audit_items_id,
                    audit_status_id,
                    audit_date,
                    audit_points,
                    audit_image_1,
                    audit_image_2,
                    audit_image_3,
                    audit_code,
                    auditor_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $tId,
                $itemData['id'],
                $statusId,
                $auditDate,
                $itemData['point'] ?? 0,
                $imagePaths[0],
                $imagePaths[1],
                $imagePaths[2],
                $auditCode,
                $auditorName
            ]);

            $updatedRows++;

        } catch (Exception $e) {
            $errors[] = "Error updating item {$itemData['id']}: " . $e->getMessage();
        }
    }

    if (!empty($errors)) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'error' => 'Some items failed to update',
            'details' => $errors
        ]);
        exit;
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Audit updated successfully',
        'rows_updated' => $updatedRows,
        'audit_date' => $auditDate
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to update audit',
        'message' => $e->getMessage()
    ]);
}
?>