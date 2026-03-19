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
$dbname = "aero_foods_finance";
$user = "postgres";
$password = "Admin123";

try {
    // Connect to PostgreSQL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $method = $_SERVER['REQUEST_METHOD'];
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = trim(str_replace('/aero-foods/' . basename($_SERVER['SCRIPT_NAME']), '', $uri), '/');
    $parts = explode('/', $path);
    $resource = !empty($parts[0]) ? $parts[0] : '';
    $id = !empty($parts[1]) ? intval($parts[1]) : null;
    $subresource = !empty($parts[1]) ? $parts[1] : '';
    $date = !empty($_GET['audit_date']) ? $_GET['audit_date'] : null;

    $response = ['status' => 'success'];

    // Helper function to parse FormData
    function parseFormData($rawInput) {
        $input = [];
        if (isset($_POST['data'])) {
            $input = json_decode($_POST['data'], true);
            error_log("Parsed JSON from _POST['data']: " . print_r($input, true));
        } else {
            // Manual parsing for FormData
            preg_match('/name="data"\r\n\r\n(.*?)(\r\n--|$)/s', $rawInput, $matches);
            if (!empty($matches[1])) {
                $input = json_decode($matches[1], true);
                error_log("Manually parsed JSON from raw input: " . print_r($input, true));
            }
        }
        return $input;
    }

    // Helper function to handle image uploads
    function handleImageUpload($field, $uploadDir) {
        if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
            $tmpName = $_FILES[$field]['tmp_name'];
            $originalName = basename($_FILES[$field]['name']);
            $extension = pathinfo($originalName, PATHINFO_EXTENSION);
            $newName = uniqid() . '.' . $extension;
            $targetPath = $uploadDir . $newName;
            if (move_uploaded_file($tmpName, $targetPath)) {
                error_log("Successfully uploaded $field to $targetPath");
                return $targetPath;
            } else {
                error_log("Failed to move uploaded file for $field");
                throw new Exception("Failed to move uploaded file for $field");
            }
        }
        return '';
    }

    if ($method === 'GET') {
        if ($resource === 'audit_type') {
            if ($id) {
                $sql = "SELECT * FROM audit_type WHERE audit_type_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([(float)$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $results = $result ? [$result] : [];
            } else {
                $sql = "SELECT * FROM audit_type";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            $response['message'] = count($results) . ' records retrieved';
            $response['results'] = $results;
        } elseif ($resource === 'audit_items') {
            if ($id) {
                $sql = "SELECT ai.audit_items_id, ai.audit_item, ai.audit_type_id, ai.audit_item_marks,
                               at.audit_type_code, at.audit_type_name, at.audit_type_evaluation
                        FROM audit_items ai
                        JOIN audit_type at ON ai.audit_type_id = at.audit_type_id
                        WHERE ai.audit_items_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([(float)$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $results = $result ? [$result] : [];
            } else {
                $sql = "SELECT ai.audit_items_id, ai.audit_item, ai.audit_type_id, ai.audit_item_marks,
                               at.audit_type_code, at.audit_type_name, at.audit_type_evaluation
                        FROM audit_items ai
                        JOIN audit_type at ON ai.audit_type_id = at.audit_type_id
                        ORDER BY ai.audit_items_id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            $response['message'] = count($results) . ' records retrieved';
            $response['results'] = $results;
        } elseif ($resource === 'audit_status') {
            if ($id) {
                $sql = "SELECT * FROM audit_status WHERE audit_status_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([(float)$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $results = $result ? [$result] : [];
            } else {
                $sql = "SELECT * FROM audit_status";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            $response['message'] = count($results) . ' records retrieved';
            $response['results'] = $results;
        } elseif ($resource === 'audit') {
            if ($subresource === 'sum_by_date') {
                $sql = "SELECT 
                            a.audit_date, 
                            SUM(a.audit_points) as total_points,
                            COUNT(*) as total_answers,
                            SUM(CASE WHEN a.audit_status_id = 1 THEN 1 ELSE 0 END) as compliant_answers,
                            SUM(CASE WHEN a.audit_status_id = 2 THEN 1 ELSE 0 END) as non_compliant_answers,
							SUM(CASE WHEN a.audit_status_id = 3 THEN 1 ELSE 0 END) as rectified_answers
                        FROM audit a
                        JOIN audit_type at ON a.audit_type_id = at.audit_type_id
                        JOIN audit_items ai ON a.audit_items_id = ai.audit_items_id
                        JOIN audit_status ast ON a.audit_status_id = ast.audit_status_id
                        GROUP BY a.audit_date
                        ORDER BY a.audit_date DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $response['message'] = count($results) . ' distinct dates with total points and answer counts retrieved';
                $response['results'] = $results;
            } else {
                $sql = "SELECT 
                            a.audit_id, 
                            a.audit_date, 
                            a.audit_points, 
                            a.audit_type_id,
                            at.audit_type_code,
                            at.audit_type_name,
                            at.audit_type_evaluation,
                            a.audit_items_id,
                            ai.audit_item,
                            ai.audit_item_marks,
                            a.audit_status_id,
                            ast.audit_status_name,
                            a.audit_image_1,
                            a.audit_image_2,
                            a.audit_image_3
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
                if (!empty($where)) {
                    $sql .= " WHERE " . implode(" AND ", $where);
                }
                $sql .= " ORDER BY a.audit_id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $grouped = [];
                foreach ($rows as $row) {
                    $aid = $row['audit_id'];
                    if (!isset($grouped[$aid])) {
                        $grouped[$aid] = [
                            'audit_id' => $aid,
                            'audit_date' => $row['audit_date'],
                            'total_points' => 0,
                            'items' => []
                        ];
                    }
                    $grouped[$aid]['total_points'] += (float)$row['audit_points'];
                    $grouped[$aid]['items'][] = [
                        'audit_type_id' => $row['audit_type_id'],
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
                $results = array_values($grouped);
                $response['message'] = count($results) . ' audit(s) retrieved with total points';
                $response['results'] = $results;
            }
        } else {
            throw new Exception('Invalid resource');
        }
    } elseif ($method === 'POST' && $resource === 'audit') {
        error_log("Raw POST data: " . file_get_contents('php://input'));
        error_log("POST _POST: " . print_r($_POST, true));
        error_log("POST _FILES: " . print_r($_FILES, true));

        $input = parseFormData(file_get_contents('php://input'));
        if (!$input || !isset($input['audit_date']) || !isset($input['audit_type_id']) || 
            !isset($input['audit_items_id']) || !isset($input['audit_status_id']) || 
            !isset($input['audit_points'])) {
            error_log("Input validation failed: " . print_r($input, true));
            throw new Exception('Invalid JSON input or missing required fields');
        }

        // Validate audit_status_id
        $sql = "SELECT audit_status_id FROM audit_status WHERE audit_status_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([(float)$input['audit_status_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid audit_status_id: ' . $input['audit_status_id']);
        }

        // Validate audit_type_id
        $sql = "SELECT audit_type_id FROM audit_type WHERE audit_type_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([(float)$input['audit_type_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid audit_type_id: ' . $input['audit_type_id']);
        }

        // Validate audit_items_id
        $sql = "SELECT audit_items_id FROM audit_items WHERE audit_items_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([(float)$input['audit_items_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid audit_items_id: ' . $input['audit_items_id']);
        }

        // Handle audit_points
        $audit_points = is_numeric($input['audit_points']) ? (float)$input['audit_points'] : 0;
        if (!is_numeric($input['audit_points'])) {
            error_log("Invalid audit_points, defaulting to 0: " . print_r($input['audit_points'], true));
        }

        // Handle image uploads
        $uploadDir = 'audit_images/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                throw new Exception('Failed to create upload directory');
            }
        }

        // Check for existing record to preserve image paths
        $sql = "SELECT audit_id, audit_image_1, audit_image_2, audit_image_3 
                FROM audit 
                WHERE audit_type_id = ? AND audit_items_id = ? AND audit_date = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            (float)$input['audit_type_id'],
            (float)$input['audit_items_id'],
            $input['audit_date']
        ]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        $images = [
            'audit_image_1' => $existing ? $existing['audit_image_1'] : '',
            'audit_image_2' => $existing ? $existing['audit_image_2'] : '',
            'audit_image_3' => $existing ? $existing['audit_image_3'] : ''
        ];

        foreach (['image1', 'image2', 'image3'] as $index => $key) {
            $field = 'audit_image_' . ($index + 1);
            $imagePath = handleImageUpload($key, $uploadDir);
            if ($imagePath) {
                $images[$field] = $imagePath;
            } elseif (isset($input[$field]) && $input[$field] && strpos($input[$field], 'audit_images/') === 0) {
                $images[$field] = $input[$field]; // Preserve full path if provided
            }
        }

        // INSERT or UPDATE on conflict
        $sql = "INSERT INTO audit (
                    audit_date, 
                    audit_type_id, 
                    audit_items_id, 
                    audit_status_id, 
                    audit_points,
                    audit_image_1,
                    audit_image_2,
                    audit_image_3
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (audit_type_id, audit_items_id, audit_date)
                DO UPDATE SET 
                    audit_status_id = EXCLUDED.audit_status_id,
                    audit_points = EXCLUDED.audit_points,
                    audit_image_1 = COALESCE(NULLIF(EXCLUDED.audit_image_1, ''), audit.audit_image_1),
                    audit_image_2 = COALESCE(NULLIF(EXCLUDED.audit_image_2, ''), audit.audit_image_2),
                    audit_image_3 = COALESCE(NULLIF(EXCLUDED.audit_image_3, ''), audit.audit_image_3)
                RETURNING audit_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['audit_date'],
            (float)$input['audit_type_id'],
            (float)$input['audit_items_id'],
            (float)$input['audit_status_id'],
            $audit_points,
            $images['audit_image_1'],
            $images['audit_image_2'],
            $images['audit_image_3']
        ]);
        $inserted_id = $stmt->fetchColumn();
        $response['message'] = 'Record inserted or updated successfully';
        $response['results'] = ['audit_id' => $inserted_id];
    } elseif ($method === 'PUT' && $resource === 'audit' && $id) {
        error_log("Raw PUT data: " . file_get_contents('php://input'));
        error_log("PUT _POST: " . print_r($_POST, true));
        error_log("PUT _FILES: " . print_r($_FILES, true));

        $input = parseFormData(file_get_contents('php://input'));
        if (!$input || !isset($input['audit_date']) || !isset($input['audit_type_id']) || 
            !isset($input['audit_items_id']) || !isset($input['audit_status_id']) || 
            !isset($input['audit_points'])) {
            error_log("Input validation failed: " . print_r($input, true));
            throw new Exception('Invalid JSON input or missing required fields');
        }

        // Validate audit_id exists
        $sql = "SELECT audit_image_1, audit_image_2, audit_image_3 FROM audit WHERE audit_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            throw new Exception('Invalid audit_id: ' . $id);
        }

        // Validate audit_status_id
        $sql = "SELECT audit_status_id FROM audit_status WHERE audit_status_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([(float)$input['audit_status_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid audit_status_id: ' . $input['audit_status_id']);
        }

        // Validate audit_type_id
        $sql = "SELECT audit_type_id FROM audit_type WHERE audit_type_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([(float)$input['audit_type_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid audit_type_id: ' . $input['audit_type_id']);
        }

        // Validate audit_items_id
        $sql = "SELECT audit_items_id FROM audit_items WHERE audit_items_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([(float)$input['audit_items_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid audit_items_id: ' . $input['audit_items_id']);
        }

        // Check for unique constraint violation (excluding current audit_id)
        $sql = "SELECT audit_id FROM audit 
                WHERE audit_type_id = ? AND audit_items_id = ? AND audit_date = ? AND audit_id != ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            (float)$input['audit_type_id'],
            (float)$input['audit_items_id'],
            $input['audit_date'],
            $id
        ]);
        if ($stmt->fetch()) {
            throw new Exception('Unique constraint violation: Record already exists for this audit_type_id, audit_items_id, and audit_date');
        }

        // Handle audit_points
        $audit_points = is_numeric($input['audit_points']) ? (float)$input['audit_points'] : 0;
        if (!is_numeric($input['audit_points'])) {
            error_log("Invalid audit_points, defaulting to 0: " . print_r($input['audit_points'], true));
        }

        // Handle image uploads
        $uploadDir = 'audit_images/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                throw new Exception('Failed to create upload directory');
            }
        }

        $images = [
            'audit_image_1' => $existing['audit_image_1'],
            'audit_image_2' => $existing['audit_image_2'],
            'audit_image_3' => $existing['audit_image_3']
        ];

        foreach (['image1', 'image2', 'image3'] as $index => $key) {
            $field = 'audit_image_' . ($index + 1);
            $imagePath = handleImageUpload($key, $uploadDir);
            if ($imagePath) {
                $images[$field] = $imagePath;
            } elseif (isset($input[$field]) && $input[$field] && strpos($input[$field], 'audit_images/') === 0) {
                $images[$field] = $input[$field]; // Preserve full path if provided
            }
        }

        $sql = "UPDATE audit SET 
                    audit_date = ?, 
                    audit_type_id = ?, 
                    audit_items_id = ?, 
                    audit_status_id = ?, 
                    audit_points = ?,
                    audit_image_1 = ?,
                    audit_image_2 = ?,
                    audit_image_3 = ?
                WHERE audit_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['audit_date'],
            (float)$input['audit_type_id'],
            (float)$input['audit_items_id'],
            (float)$input['audit_status_id'],
            $audit_points,
            $images['audit_image_1'],
            $images['audit_image_2'],
            $images['audit_image_3'],
            $id
        ]);
        $rowCount = $stmt->rowCount();
        error_log("PUT update for audit_id $id affected $rowCount rows");
        if ($rowCount === 0) {
            throw new Exception('No record updated for audit_id: ' . $id);
        }
        $response['message'] = 'Record updated successfully';
        $response['results'] = ['updated_audit_id' => $id];
    } else {
        throw new Exception('Invalid method or resource');
    }

    echo json_encode($response);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Database error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage(),
        'error_code' => $e->getCode()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    error_log("Error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>