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

    // Fetch existing record to merge with incoming data
    $fetch_stmt = $pdo->prepare("SELECT * FROM public.food_outsource_materials WHERE id = :id");
    $fetch_stmt->execute([':id' => (int)$data['id']]);
    $existing = $fetch_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        throw new Exception("Record with id " . $data['id'] . " not found");
    }

    // Use incoming values or fall back to existing
    $price = (float)($data['price'] ?? $existing['price']);
    $tax = (float)($data['tax'] ?? $existing['tax']);
    $purchase_quantity = (float)($data['purchase_quantity'] ?? $existing['purchase_quantity']);
    $selling_price = (float)($data['selling_price'] ?? $existing['selling_price']);

    // Auto-calculate total_amount = (price + (tax / 100)) * purchase_quantity
    $price_with_tax = $price + ($tax / 100);
    $total_amount = $price_with_tax * $purchase_quantity;

    // Auto-calculate profit % = ((selling_price - price_with_tax) / price_with_tax) * 100
    $profit = 0;
    if ($price_with_tax > 0) {
        $profit = (($selling_price - $price_with_tax) / $price_with_tax) * 100;
    }

    $sql = "UPDATE public.food_outsource_materials SET
        vendor_name = :vendor_name,
        material_name = :material_name,
        price = :price,
        unit = :unit,
        tax = :tax,
        purchase_quantity = :purchase_quantity,
        total_amount = :total_amount,
        selling_price = :selling_price,
        profit = :profit,
        purchase_person = :purchase_person,
        updated_by = :updated_by,
        updated_at = NOW()
    WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => (int)$data['id'],
        ':vendor_name' => trim($data['vendor_name'] ?? $existing['vendor_name']),
        ':material_name' => trim($data['material_name'] ?? $existing['material_name']),
        ':price' => $price,
        ':unit' => trim($data['unit'] ?? $existing['unit']),
        ':tax' => $tax,
        ':purchase_quantity' => $purchase_quantity,
        ':total_amount' => round($total_amount, 2),
        ':selling_price' => $selling_price,
        ':profit' => round($profit, 2),
        ':purchase_person' => trim($data['purchase_person'] ?? $existing['purchase_person']),
        ':updated_by' => $data['updated_by'] ?? ''
    ]);

    $affected = $stmt->rowCount();

    echo json_encode([
        'status' => 'success',
        'message' => $affected > 0 ? 'Material updated successfully' : 'No changes made',
        'id' => (int)$data['id'],
        'calculated' => [
            'price_with_tax' => round($price_with_tax, 2),
            'total_amount' => round($total_amount, 2),
            'profit_percentage' => round($profit, 2)
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