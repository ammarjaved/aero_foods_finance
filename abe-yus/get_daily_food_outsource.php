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

    $sql = "SELECT d.*, m.vendor_name, m.price, m.tax, m.unit, m.selling_price, m.purchase_person
            FROM public.daily_food_outsource d
            LEFT JOIN public.food_outsource_materials m ON d.material_id = m.id
            WHERE 1=1";
    $params = [];

    // Filter by id
    if (isset($_GET['id']) && $_GET['id'] !== '') {
        $sql .= " AND d.id = :id";
        $params[':id'] = (int)$_GET['id'];
    }

    // Filter by material_id
    if (isset($_GET['material_id']) && $_GET['material_id'] !== '') {
        $sql .= " AND d.material_id = :material_id";
        $params[':material_id'] = (int)$_GET['material_id'];
    }

    // Filter by material_name
    if (isset($_GET['material_name']) && $_GET['material_name'] !== '') {
        $sql .= " AND LOWER(d.material_name) LIKE LOWER(:material_name)";
        $params[':material_name'] = '%' . trim($_GET['material_name']) . '%';
    }

    // Filter by outsource_type
    if (isset($_GET['outsource_type']) && $_GET['outsource_type'] !== '') {
        $sql .= " AND LOWER(d.outsource_type) = LOWER(:outsource_type)";
        $params[':outsource_type'] = trim($_GET['outsource_type']);
    }

    // Filter by exact date
    if (isset($_GET['month_date']) && $_GET['month_date'] !== '') {
        $sql .= " AND d.month_date = :month_date";
        $params[':month_date'] = $_GET['month_date'];
    }

    // Filter by date range
    if (isset($_GET['date_from']) && $_GET['date_from'] !== '') {
        $sql .= " AND d.month_date >= :date_from";
        $params[':date_from'] = $_GET['date_from'];
    }
    if (isset($_GET['date_to']) && $_GET['date_to'] !== '') {
        $sql .= " AND d.month_date <= :date_to";
        $params[':date_to'] = $_GET['date_to'];
    }

    // Filter by vendor_name (from materials join)
    if (isset($_GET['vendor_name']) && $_GET['vendor_name'] !== '') {
        $sql .= " AND LOWER(m.vendor_name) LIKE LOWER(:vendor_name)";
        $params[':vendor_name'] = '%' . trim($_GET['vendor_name']) . '%';
    }

    $sql .= " ORDER BY d.month_date DESC, d.id DESC";

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