<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
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
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = trim(str_replace('/aero-foods/' . basename($_SERVER['SCRIPT_NAME']), '', $uri), '/');
    $parts = explode('/', $path);
    $resource = !empty($parts[0]) ? $parts[0] : '';
    $id = !empty($parts[1]) ? intval($parts[1]) : null;
    $subresource = !empty($parts[1]) ? $parts[1] : '';
    $date = !empty($_GET['audit_date']) ? $_GET['audit_date'] : null;
    $audit_code = !empty($_GET['audit_code']) ? $_GET['audit_code'] : null;

    // Connect to PostgreSQL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $response = ['status' => 'success'];

    // ─── GET ────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $response = handleGet($pdo, $resource, $id, $subresource, $date, $audit_code);
    }
    // ─── POST / PUT for audit ───────────────────────────────────────────
    elseif (($method === 'POST' || $method === 'PUT') && $resource === 'audit') {
        $response = handleUpsert($pdo, $method, $id);
    } else {
        throw new Exception('Invalid method or resource');
    }

    echo json_encode($response);

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


// ═══════════════════════════════════════════════════════════════════════
// GET handler
// ═══════════════════════════════════════════════════════════════════════
function handleGet($pdo, $resource, $id, $subresource, $date, $audit_code) {
    $response = ['status' => 'success'];

    switch ($resource) {
        case 'audit_type':
            $results = fetchSimple($pdo, 'audit_type', 'audit_type_id', $id);
            break;

        case 'audit_items':
            $results = fetchAuditItems($pdo, $id);
            break;

        case 'audit_status':
            $results = fetchSimple($pdo, 'audit_status', 'audit_status_id', $id);
            break;

        case 'audit':
            if ($subresource === 'sum_by_date') {
                $results = fetchAuditSumByDate($pdo, $audit_code);
            } else {
                $results = fetchAuditDetails($pdo, $id, $date, $audit_code);
            }
            break;

        default:
            throw new Exception('Invalid resource');
    }

    $response['message'] = count($results) . ' records retrieved';
    $response['results'] = $results;
    return $response;
}

function fetchSimple($pdo, $table, $idCol, $id) {
    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM $table WHERE $idCol = ?");
        $stmt->execute([(float)$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? [$row] : [];
    }
    return $pdo->query("SELECT * FROM $table")->fetchAll(PDO::FETCH_ASSOC);
}

function fetchAuditItems($pdo, $id) {
    $base = "SELECT ai.audit_items_id, ai.audit_item, ai.audit_type_id, ai.audit_item_marks,
                    at.audit_type_code, at.audit_type_name, at.audit_type_evaluation
             FROM audit_items ai
             JOIN audit_type at ON ai.audit_type_id = at.audit_type_id";
    if ($id) {
        $stmt = $pdo->prepare("$base WHERE ai.audit_items_id = ?");
        $stmt->execute([(float)$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? [$row] : [];
    }
    return $pdo->query("$base ORDER BY ai.audit_items_id")->fetchAll(PDO::FETCH_ASSOC);
}

function fetchAuditSumByDate($pdo, $audit_code) {
    // Get total audit items count for percentage calculation
    $totalItemsStmt = $pdo->query("SELECT COUNT(*) FROM audit_items");
    $totalItems = (int)$totalItemsStmt->fetchColumn();

    $sql = "SELECT a.audit_date, a.auditor_name, a.audit_code,
                   SUM(a.audit_points) as total_points,
                   COUNT(*) as total_answers,
                   SUM(CASE WHEN a.audit_status_id = 1 THEN 1 ELSE 0 END) as compliant_answers,
                   SUM(CASE WHEN a.audit_status_id = 2 THEN 1 ELSE 0 END) as non_compliant_answers,
                   SUM(CASE WHEN a.audit_status_id = 3 THEN 1 ELSE 0 END) as rectified_answers
            FROM audit a
            JOIN audit_type at ON a.audit_type_id = at.audit_type_id
            JOIN audit_items ai ON a.audit_items_id = ai.audit_items_id
            JOIN audit_status ast ON a.audit_status_id = ast.audit_status_id";

    $params = [];
    $where = [];
    if ($audit_code) {
        $where[] = "a.audit_code = ?";
        $params[] = $audit_code;
    }
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " GROUP BY a.audit_date, a.auditor_name, a.audit_code
              ORDER BY a.audit_date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Add percentage to each row
    foreach ($rows as &$row) {
        $answered = (int)$row['total_answers'];
        $row['total_items'] = $totalItems;
        $row['submitted_percentage'] = $totalItems > 0 ? round(($answered / $totalItems) * 100, 2) : 0;
    }

    return $rows;
}


function fetchAuditDetails($pdo, $id, $date, $audit_code) {
    $sql = "SELECT a.audit_id, a.audit_date, a.auditor_name, a.audit_code, a.audit_points,
                   a.audit_type_id, at.audit_type_code, at.audit_type_name, at.audit_type_evaluation,
                   a.audit_items_id, ai.audit_item, ai.audit_item_marks,
                   a.audit_status_id, ast.audit_status_name,
                   a.audit_image_1, a.audit_image_2, a.audit_image_3
            FROM audit a
            JOIN audit_type at ON a.audit_type_id = at.audit_type_id
            JOIN audit_items ai ON a.audit_items_id = ai.audit_items_id
            JOIN audit_status ast ON a.audit_status_id = ast.audit_status_id";

    $params = [];
    $where = [];
    if ($id) {
        $where[] = "a.audit_id = ?";
        $params[] = $id;
    }
    if ($date) {
        $where[] = "a.audit_date = ?";
        $params[] = $date;
    }
    if ($audit_code) {
        $where[] = "a.audit_code = ?";
        $params[] = $audit_code;
    }
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY a.audit_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group by audit_id
    $grouped = [];
    foreach ($rows as $row) {
        $aid = $row['audit_id'];
        if (!isset($grouped[$aid])) {
            $grouped[$aid] = [
                'audit_id' => $aid,
                'audit_date' => $row['audit_date'],
                'audit_code' => $row['audit_code'],
                'total_points' => 0,
                'items' => []
            ];
        }
        $grouped[$aid]['total_points'] += (float)$row['audit_points'];
        $grouped[$aid]['items'][] = [
            'audit_type_id' => $row['audit_type_id'],
            'auditor_name' => $row['auditor_name'],
            'audit_type_code' => $row['audit_type_code'],
            'audit_type_name' => $row['audit_type_name'],
            'audit_type_evaluation' => $row['audit_type_evaluation'],
            'audit_items_id' => $row['audit_items_id'],
            'audit_item' => $row['audit_item'],
            'audit_item_marks' => (float)$row['audit_item_marks'],
            'audit_status_id' => $row['audit_status_id'],
            'audit_status_name' => $row['audit_status_name'],
            'audit_points' => (float)$row['audit_points'],
            'audit_image_1' => $row['audit_image_1'],
            'audit_image_2' => $row['audit_image_2'],
            'audit_image_3' => $row['audit_image_3']
        ];
    }
    return array_values($grouped);
}

// ═══════════════════════════════════════════════════════════════════════
// POST / PUT handler (unified upsert)
// ═══════════════════════════════════════════════════════════════════════
function handleUpsert($pdo, $method, $id) {
    // Parse input
    $input = null;
    if (isset($_POST['data'])) {
        $input = json_decode($_POST['data'], true);
    } else {
        $raw = file_get_contents('php://input');
        preg_match('/name="data"\r\n\r\n(.*?)(\r\n--|$)/s', $raw, $matches);
        if (!empty($matches[1])) {
            $input = json_decode($matches[1], true);
        }
    }

    if (!$input || !isset($input['audit_date'], $input['audit_type_id'],
                          $input['audit_items_id'], $input['audit_status_id'],
                          $input['audit_points'], $input['audit_code'])) {
        throw new Exception('Invalid input or missing required fields (audit_date, audit_code, audit_type_id, audit_items_id, audit_status_id, audit_points)');
    }

    // Validate all foreign keys in a single query
    validateForeignKeys($pdo, $input);

    // For PUT, validate audit_id exists
    if ($method === 'PUT') {
        if (!$id) {
            throw new Exception('audit_id is required for PUT');
        }
        $stmt = $pdo->prepare("SELECT audit_id FROM audit WHERE audit_id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid audit_id: ' . $id);
        }

        // Check unique constraint excluding current record
        $stmt = $pdo->prepare("SELECT audit_id FROM audit WHERE audit_type_id = ? AND audit_items_id = ? AND audit_date = ? AND audit_code = ? AND audit_id != ?");
        $stmt->execute([(float)$input['audit_type_id'], (float)$input['audit_items_id'], $input['audit_date'], $input['audit_code'], $id]);
        if ($stmt->fetch()) {
            throw new Exception('Duplicate: record already exists for this audit_type_id, audit_items_id, audit_date, and audit_code');
        }
    }

    $audit_points = is_numeric($input['audit_points']) ? (float)$input['audit_points'] : 0;

    // Handle images
    $images = resolveImages($input, $method === 'PUT' ? $id : null, $pdo);

    if ($method === 'PUT') {
        return executePut($pdo, $input, $audit_points, $images, $id);
    }
    return executePost($pdo, $input, $audit_points, $images);
}


// Validate status, type, and items IDs in three separate queries
function validateForeignKeys($pdo, $input) {
    $stmt = $pdo->prepare("SELECT audit_status_id FROM audit_status WHERE audit_status_id = ?");
    $stmt->execute([(float)$input['audit_status_id']]);
    if (!$stmt->fetch()) {
        throw new Exception('Invalid audit_status_id: ' . $input['audit_status_id']);
    }

    $stmt = $pdo->prepare("SELECT audit_type_id FROM audit_type WHERE audit_type_id = ?");
    $stmt->execute([(float)$input['audit_type_id']]);
    if (!$stmt->fetch()) {
        throw new Exception('Invalid audit_type_id: ' . $input['audit_type_id']);
    }

    $stmt = $pdo->prepare("SELECT audit_items_id FROM audit_items WHERE audit_items_id = ?");
    $stmt->execute([(float)$input['audit_items_id']]);
    if (!$stmt->fetch()) {
        throw new Exception('Invalid audit_items_id: ' . $input['audit_items_id']);
    }
}

// Resolve image paths from upload or existing record
function resolveImages($input, $existingId, $pdo) {
    $uploadDir = 'audit_images/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Load existing images if updating
    $existing = ['audit_image_1' => '', 'audit_image_2' => '', 'audit_image_3' => ''];
    if ($existingId) {
        $stmt = $pdo->prepare("SELECT audit_image_1, audit_image_2, audit_image_3 FROM audit WHERE audit_id = ?");
        $stmt->execute([$existingId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) $existing = $row;
    }

    $images = $existing;
    foreach (['image1' => 'audit_image_1', 'image2' => 'audit_image_2', 'image3' => 'audit_image_3'] as $fileKey => $field) {
        if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo(basename($_FILES[$fileKey]['name']), PATHINFO_EXTENSION);
            $newName = uniqid('audit_', true) . '.' . $ext;
            $targetPath = $uploadDir . $newName;
            if (move_uploaded_file($_FILES[$fileKey]['tmp_name'], $targetPath)) {
                $images[$field] = $targetPath;
            } else {
                throw new Exception("Failed to upload $fileKey");
            }
        } elseif (isset($input[$field]) && $input[$field] && strpos($input[$field], 'audit_images/') === 0) {
            $images[$field] = $input[$field];
        }
    }
    return $images;
}

function executePost($pdo, $input, $audit_points, $images) {
    $sql = "INSERT INTO audit (
                audit_date, audit_code, auditor_name, audit_type_id, audit_items_id,
                audit_status_id, audit_points, audit_image_1, audit_image_2, audit_image_3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (audit_type_id, audit_items_id, audit_date, audit_code)
            DO UPDATE SET
                audit_code = EXCLUDED.audit_code,
                audit_status_id = EXCLUDED.audit_status_id,
                audit_points = EXCLUDED.audit_points,
                audit_image_1 = COALESCE(NULLIF(EXCLUDED.audit_image_1, ''), audit.audit_image_1),
                audit_image_2 = COALESCE(NULLIF(EXCLUDED.audit_image_2, ''), audit.audit_image_2),
                audit_image_3 = COALESCE(NULLIF(EXCLUDED.audit_image_3, ''), audit.audit_image_3)
            RETURNING audit_id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $input['audit_date'],
        $input['audit_code'],
        $input['auditor_name'] ?? '',
        (float)$input['audit_type_id'],
        (float)$input['audit_items_id'],
        (float)$input['audit_status_id'],
        $audit_points,
        $images['audit_image_1'],
        $images['audit_image_2'],
        $images['audit_image_3']
    ]);

    // Update auditor_name across all rows with the same audit_code
    $auditor_name = $input['auditor_name'] ?? '';
    if ($auditor_name !== '' && !empty($input['audit_code'])) {
        $updateStmt = $pdo->prepare("UPDATE audit SET auditor_name = ? WHERE audit_code = ?");
        $updateStmt->execute([$auditor_name, $input['audit_code']]);
    }

    return [
        'status' => 'success',
        'message' => 'Record inserted or updated successfully',
        'results' => ['audit_id' => $stmt->fetchColumn()]
    ];
}

function executePut($pdo, $input, $audit_points, $images, $id) {
    $sql = "UPDATE audit SET
                audit_date = ?, audit_code = ?, auditor_name = ?, audit_type_id = ?, audit_items_id = ?,
                audit_status_id = ?, audit_points = ?,
                audit_image_1 = ?, audit_image_2 = ?, audit_image_3 = ?
            WHERE audit_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $input['audit_date'],
        $input['audit_code'],
        $input['auditor_name'] ?? '',
        (float)$input['audit_type_id'],
        (float)$input['audit_items_id'],
        (float)$input['audit_status_id'],
        $audit_points,
        $images['audit_image_1'],
        $images['audit_image_2'],
        $images['audit_image_3'],
        $id
    ]);
    if ($stmt->rowCount() === 0) {
        throw new Exception('No record updated for audit_id: ' . $id);
    }

    // Update auditor_name across all rows with the same audit_code
    $auditor_name = $input['auditor_name'] ?? '';
    if ($auditor_name !== '' && !empty($input['audit_code'])) {
        $updateStmt = $pdo->prepare("UPDATE audit SET auditor_name = ? WHERE audit_code = ?");
        $updateStmt->execute([$auditor_name, $input['audit_code']]);
    }

    return [
        'status' => 'success',
        'message' => 'Record updated successfully',
        'results' => ['updated_audit_id' => $id]
    ];
}
?>