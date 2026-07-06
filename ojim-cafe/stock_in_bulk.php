<?php
// Enable CORS for React Native
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
$dbname = "ojim_finance";
$user = "postgres";
$password = "Admin123";

try {
    // Connect to PostgreSQL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data) {
        throw new Exception("Invalid JSON input");
    }

    $sql = "INSERT INTO public.stock_in (
        month_date, month, year, day, code, name, description, category,
        unit_price, packet, unit, total_box, order_number
    ) VALUES (
        :month_date, :month, :year, :day, :code, :name, :description, :category,
        :unit_price, :packet, :unit, :total_box, :order_number
    )
    ON CONFLICT (month_date, code) DO UPDATE SET
        month = EXCLUDED.month,
        year = EXCLUDED.year,
        day = EXCLUDED.day,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        unit_price = EXCLUDED.unit_price,
        packet = EXCLUDED.packet,
        unit = EXCLUDED.unit,
        total_box = EXCLUDED.total_box,
        order_number = EXCLUDED.order_number";

$stmt = $pdo->prepare($sql);

// Process all items in a transaction
$pdo->beginTransaction();
$results = [];

foreach ($data as $item) {
$params = [
    ':month_date' => $item['month_date'],
    ':month' => (int)$item['month'],
    ':year' => (int)$item['year'],
    ':day' => (int)$item['day'],
    ':code' => $item['code'],
    ':name' => $item['name'],
    ':description' => $item['description'] ?? null,
    ':category' => $item['category'],
    ':unit_price' => (float)$item['unit_price'],
    ':packet' => (int)$item['packet'],
    ':unit' => $item['unit'],
    ':total_box' => (int)$item['total_transaction_in'],
    ':order_number' => $item['order_number'] ?? ""
];

$stmt->execute($params);
$results[] = [
    'code' => $item['code'],
    'month_date' => $item['month_date'],
    'action' => $stmt->rowCount() > 0 ? 'inserted_or_updated' : 'no_change'
];
}

$pdo->commit();

echo json_encode([
'status' => 'success',
'message' => count($results) . ' records processed',
'results' => $results
]);

} catch (PDOException $e) {
// Rollback on error
if (isset($pdo) && $pdo->inTransaction()) {
$pdo->rollBack();
}

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