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
$dbname = "abe_yus_finance";
$user = "postgres";
$password = "Admin123";

try {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!$data) {
        throw new Exception("Invalid JSON input");
    }

    if (!isset($data['material_id']) || empty($data['material_id'])) {
        throw new Exception("material_id is required");
    }

    if (!isset($data['outsource_type']) || empty(trim($data['outsource_type']))) {
        throw new Exception("outsource_type is required (wastage or sale)");
    }

    $outsource_type = strtolower(trim($data['outsource_type']));
    if (!in_array($outsource_type, ['wastage', 'sale'])) {
        throw new Exception("outsource_type must be 'wastage' or 'sale'");
    }

    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch material details from food_outsource_materials by id
    $mat_stmt = $pdo->prepare("SELECT * FROM public.food_outsource_materials WHERE id = :material_id");
    $mat_stmt->execute([':material_id' => (int)$data['material_id']]);
    $material = $mat_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$material) {
        throw new Exception("Material with id " . $data['material_id'] . " not found in food_outsource_materials");
    }

    $sql = "INSERT INTO public.daily_food_outsource (
        month_date, material_id, material_name, outsource_type, quantity, created_by, updated_by
    ) VALUES (
        :month_date, :material_id, :material_name, :outsource_type, :quantity, :created_by, :updated_by
    ) RETURNING id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':month_date' => $data['month_date'] ?? date('Y-m-d'),
        ':material_id' => (int)$data['material_id'],
        ':material_name' => $material['material_name'],
        ':outsource_type' => $outsource_type,
        ':quantity' => (float)($data['quantity'] ?? 0),
        ':created_by' => $data['created_by'] ?? '',
        ':updated_by' => $data['updated_by'] ?? ''
    ]);

    $id = $stmt->fetchColumn();

    $quantity = (float)($data['quantity'] ?? 0);
    $price_with_tax = (float)$material['price'] + ((float)$material['tax'] / 100);
    $amount = $price_with_tax * $quantity;

    echo json_encode([
        'status' => 'success',
        'message' => 'Daily food outsource record added successfully',
        'id' => $id,
        'material_details' => [
            'material_id' => $material['id'],
            'vendor_name' => $material['vendor_name'],
            'price' => (float)$material['price'],
            'tax' => (float)$material['tax'],
            'price_with_tax' => round($price_with_tax, 2),
            'selling_price' => (float)$material['selling_price'],
            'unit' => $material['unit']
        ],
        'outsource_type' => $outsource_type,
        'quantity' => $quantity,
        'amount' => round($amount, 2),
        'impact' => $outsource_type === 'wastage' ? 'loss' : 'profit'
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