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

    if (!isset($data['id']) || empty($data['id'])) {
        throw new Exception("id is required for update");
    }

    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch existing record
    $fetch_stmt = $pdo->prepare("SELECT * FROM public.daily_food_outsource WHERE id = :id");
    $fetch_stmt->execute([':id' => (int)$data['id']]);
    $existing = $fetch_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        throw new Exception("Record with id " . $data['id'] . " not found");
    }

    $material_id = (int)($data['material_id'] ?? $existing['material_id']);
    $outsource_type = strtolower(trim($data['outsource_type'] ?? $existing['outsource_type']));

    if (!in_array($outsource_type, ['wastage', 'sale'])) {
        throw new Exception("outsource_type must be 'wastage' or 'sale'");
    }

    // Validate material exists by id
    $mat_stmt = $pdo->prepare("SELECT * FROM public.food_outsource_materials WHERE id = :material_id");
    $mat_stmt->execute([':material_id' => $material_id]);
    $material = $mat_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$material) {
        throw new Exception("Material with id " . $material_id . " not found in food_outsource_materials");
    }

    $sql = "UPDATE public.daily_food_outsource SET
        month_date = :month_date,
        material_id = :material_id,
        material_name = :material_name,
        outsource_type = :outsource_type,
        quantity = :quantity,
        updated_by = :updated_by,
        updated_at = NOW()
    WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => (int)$data['id'],
        ':month_date' => $data['month_date'] ?? $existing['month_date'],
        ':material_id' => $material_id,
        ':material_name' => $material['material_name'],
        ':outsource_type' => $outsource_type,
        ':quantity' => (float)($data['quantity'] ?? $existing['quantity']),
        ':updated_by' => $data['updated_by'] ?? ''
    ]);

    $affected = $stmt->rowCount();

    echo json_encode([
        'status' => 'success',
        'message' => $affected > 0 ? 'Record updated successfully' : 'No changes made',
        'id' => (int)$data['id'],
        'material_details' => [
            'material_id' => $material['id'],
            'vendor_name' => $material['vendor_name'],
            'price' => (float)$material['price'],
            'tax' => (float)$material['tax'],
            'selling_price' => (float)$material['selling_price'],
            'unit' => $material['unit']
        ]
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