<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
$dbname = "abe_yus_finance";
$user = "postgres";
$password = "Admin123";

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "SELECT * FROM public.food_outsource_materials WHERE 1=1";
    $params = [];

    // Filter by id
    if (isset($_GET['id']) && $_GET['id'] !== '') {
        $sql .= " AND id = :id";
        $params[':id'] = (int)$_GET['id'];
    }

    // Search by vendor_name
    if (isset($_GET['vendor_name']) && $_GET['vendor_name'] !== '') {
        $sql .= " AND LOWER(vendor_name) LIKE LOWER(:vendor_name)";
        $params[':vendor_name'] = '%' . trim($_GET['vendor_name']) . '%';
    }

    // Search by material_name
    if (isset($_GET['material_name']) && $_GET['material_name'] !== '') {
        $sql .= " AND LOWER(material_name) LIKE LOWER(:material_name)";
        $params[':material_name'] = '%' . trim($_GET['material_name']) . '%';
    }

    // Search by purchase_person
    if (isset($_GET['purchase_person']) && $_GET['purchase_person'] !== '') {
        $sql .= " AND LOWER(purchase_person) LIKE LOWER(:purchase_person)";
        $params[':purchase_person'] = '%' . trim($_GET['purchase_person']) . '%';
    }

    // Search by unit
    if (isset($_GET['unit']) && $_GET['unit'] !== '') {
        $sql .= " AND LOWER(unit) LIKE LOWER(:unit)";
        $params[':unit'] = '%' . trim($_GET['unit']) . '%';
    }

    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'message' => count($results) . ' records retrieved',
        'results' => $results
    ]);

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
?>