<?php
// save_allowance.php - Insert or update an allowance

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

$host = '192.168.1.34';
$port = '5432';
$user = 'postgres';
$password = 'Admin123';

$dbMap = [
    'mixue'      => 'aero_foods_finance',
    'abe'        => 'abe_yus_finance',
    'amz'        => 'amazon_cafe_finance',
    'ojim'       => 'ojim_finance',
    'amz-lyp'    => 'amazon_cafe_finance_lyp',
    'mixue-sogo' => 'mixue_sogo',
];

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !is_array($input)) {
        throw new Exception('Invalid JSON input');
    }

    $cafeKey = isset($input['db']) ? $input['db'] : 'mixue';
    $dbname  = $dbMap[$cafeKey] ?? 'aero_foods_finance';

    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Validate required fields
    if (empty($input['employee_name'])) {
        throw new Exception("Missing required field: employee_name");
    }
    if (empty($input['allowance_type'])) {
        throw new Exception("Missing required field: allowance_type");
    }
    if (!isset($input['amount']) || $input['amount'] === '') {
        throw new Exception("Missing required field: amount");
    }

    $employeeName   = trim($input['employee_name']);
    $allowanceType  = trim($input['allowance_type']);
    $amount         = floatval($input['amount']);
    $isRecurring    = isset($input['is_recurring']) ? (bool)$input['is_recurring'] : true;
    $effectiveFrom  = !empty($input['effective_from']) ? $input['effective_from'] : date('Y-m-d');
    $effectiveTo    = !empty($input['effective_to']) ? $input['effective_to'] : null;
    $createdBy      = isset($input['created_by']) ? $input['created_by'] : null;

    $isUpdate = isset($input['id']) && !empty($input['id']);

    if ($isUpdate) {
        $sql = "UPDATE employee_allowances
                SET employee_name  = :employee_name,
                    allowance_type = :allowance_type,
                    amount         = :amount,
                    is_recurring   = :is_recurring,
                    effective_from = :effective_from,
                    effective_to   = :effective_to,
                    updated_by     = :updated_by,
                    updated_at     = CURRENT_TIMESTAMP
                WHERE id = :id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':id',             $input['id'],        PDO::PARAM_INT);
        $stmt->bindParam(':employee_name',  $employeeName,       PDO::PARAM_STR);
        $stmt->bindParam(':allowance_type', $allowanceType,      PDO::PARAM_STR);
        $stmt->bindParam(':amount',         $amount,             PDO::PARAM_STR);
        $stmt->bindParam(':is_recurring',   $isRecurring,        PDO::PARAM_BOOL);
        $stmt->bindParam(':effective_from', $effectiveFrom,      PDO::PARAM_STR);
        $stmt->bindParam(':effective_to',   $effectiveTo,        PDO::PARAM_STR);
        $stmt->bindParam(':updated_by',     $createdBy,          PDO::PARAM_STR);
        $stmt->execute();

        echo json_encode([
            'status' => 'success',
            'message' => 'Allowance updated successfully',
            'id' => $input['id'],
            'action' => 'updated'
        ]);
    } else {
        $sql = "INSERT INTO employee_allowances
                    (employee_name, allowance_type, amount, is_recurring, effective_from, effective_to, created_by)
                VALUES
                    (:employee_name, :allowance_type, :amount, :is_recurring, :effective_from, :effective_to, :created_by)
                RETURNING id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':employee_name',  $employeeName,       PDO::PARAM_STR);
        $stmt->bindParam(':allowance_type', $allowanceType,      PDO::PARAM_STR);
        $stmt->bindParam(':amount',         $amount,             PDO::PARAM_STR);
        $stmt->bindParam(':is_recurring',   $isRecurring,        PDO::PARAM_BOOL);
        $stmt->bindParam(':effective_from', $effectiveFrom,      PDO::PARAM_STR);
        $stmt->bindParam(':effective_to',   $effectiveTo,        PDO::PARAM_STR);
        $stmt->bindParam(':created_by',     $createdBy,          PDO::PARAM_STR);
        $stmt->execute();

        $newId = $stmt->fetchColumn();

        echo json_encode([
            'status' => 'success',
            'message' => 'Allowance added successfully',
            'id' => $newId,
            'action' => 'inserted'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}

$conn = null;
?>
