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

    if (!isset($data['material_name']) || empty(trim($data['material_name']))) {
        throw new Exception("material_name is required");
    }

    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $price = (float)($data['price'] ?? 0);
    $tax = (float)($data['tax'] ?? 0);
    $purchase_quantity = (float)($data['purchase_quantity'] ?? 0);
    $selling_price = (float)($data['selling_price'] ?? 0);

    // Auto-calculate total_amount = (price + (tax / 100)) * purchase_quantity
    $price_with_tax = $price + ($tax / 100);
    $total_amount = $price_with_tax * $purchase_quantity;

    // Auto-calculate profit % = ((selling_price - price_with_tax) / price_with_tax) * 100
    $profit = 0;
    if ($price_with_tax > 0) {
        $profit = (($selling_price - $price_with_tax) / $price_with_tax) * 100;
    }

    $sql = "INSERT INTO public.food_outsource_materials (
        vendor_name, material_name, price, unit, tax, purchase_quantity,
        total_amount, selling_price, profit, purchase_person, created_by, updated_by
    ) VALUES (
        :vendor_name, :material_name, :price, :unit, :tax, :purchase_quantity,
        :total_amount, :selling_price, :profit, :purchase_person, :created_by, :updated_by
    ) RETURNING id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':vendor_name' => trim($data['vendor_name'] ?? ''),
        ':material_name' => trim($data['material_name']),
        ':price' => $price,
        ':unit' => trim($data['unit'] ?? ''),
        ':tax' => $tax,
        ':purchase_quantity' => $purchase_quantity,
        ':total_amount' => round($total_amount, 2),
        ':selling_price' => $selling_price,
        ':profit' => round($profit, 2),
        ':purchase_person' => trim($data['purchase_person'] ?? ''),
        ':created_by' => $data['created_by'] ?? '',
        ':updated_by' => $data['updated_by'] ?? ''
    ]);

    $id = $stmt->fetchColumn();

    echo json_encode([
        'status' => 'success',
        'message' => 'Material added successfully',
        'id' => $id,
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