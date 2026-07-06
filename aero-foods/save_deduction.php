<?php
// save_deduction.php - Insert or update a deduction

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
    if (empty($input['deduction_type'])) {
        throw new Exception("Missing required field: deduction_type");
    }
    if (!isset($input['amount']) || $input['amount'] === '') {
        throw new Exception("Missing required field: amount");
    }

    $employeeName     = trim($input['employee_name']);
    $deductionType    = trim($input['deduction_type']);
    $amount           = floatval($input['amount']);
    $isRecurring      = isset($input['is_recurring']) ? (bool)$input['is_recurring'] : true;
    $isAutoCalculated = isset($input['is_auto_calculated']) ? (bool)$input['is_auto_calculated'] : false;
    $payMonth         = !empty($input['pay_month']) ? $input['pay_month'] : null;
    $payYear          = !empty($input['pay_year']) ? $input['pay_year'] : null;
    $installmentNo    = isset($input['installment_no']) ? intval($input['installment_no']) : 0;
    $totalInstallments = isset($input['total_installments']) ? intval($input['total_installments']) : 0;
    $createdBy        = isset($input['created_by']) ? $input['created_by'] : null;

    $isUpdate = isset($input['id']) && !empty($input['id']);

    if ($isUpdate) {
        $sql = "UPDATE employee_deductions
                SET employee_name      = :employee_name,
                    deduction_type     = :deduction_type,
                    amount             = :amount,
                    is_recurring       = :is_recurring,
                    is_auto_calculated = :is_auto_calculated,
                    pay_month          = :pay_month,
                    pay_year           = :pay_year,
                    installment_no     = :installment_no,
                    total_installments = :total_installments,
                    updated_by         = :updated_by,
                    updated_at         = CURRENT_TIMESTAMP
                WHERE id = :id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':id',                $input['id'],           PDO::PARAM_INT);
        $stmt->bindParam(':employee_name',     $employeeName,          PDO::PARAM_STR);
        $stmt->bindParam(':deduction_type',    $deductionType,         PDO::PARAM_STR);
        $stmt->bindParam(':amount',            $amount,                PDO::PARAM_STR);
        $stmt->bindParam(':is_recurring',      $isRecurring,           PDO::PARAM_BOOL);
        $stmt->bindParam(':is_auto_calculated',$isAutoCalculated,     PDO::PARAM_BOOL);
        $stmt->bindParam(':pay_month',         $payMonth,              PDO::PARAM_STR);
        $stmt->bindParam(':pay_year',          $payYear,               PDO::PARAM_STR);
        $stmt->bindParam(':installment_no',    $installmentNo,         PDO::PARAM_INT);
        $stmt->bindParam(':total_installments',$totalInstallments,    PDO::PARAM_INT);
        $stmt->bindParam(':updated_by',        $createdBy,             PDO::PARAM_STR);
        $stmt->execute();

        echo json_encode([
            'status' => 'success',
            'message' => 'Deduction updated successfully',
            'id' => $input['id'],
            'action' => 'updated'
        ]);
    } else {
        $sql = "INSERT INTO employee_deductions
                    (employee_name, deduction_type, amount, is_recurring, is_auto_calculated,
                     pay_month, pay_year, installment_no, total_installments, created_by)
                VALUES
                    (:employee_name, :deduction_type, :amount, :is_recurring, :is_auto_calculated,
                     :pay_month, :pay_year, :installment_no, :total_installments, :created_by)
                RETURNING id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':employee_name',     $employeeName,          PDO::PARAM_STR);
        $stmt->bindParam(':deduction_type',    $deductionType,         PDO::PARAM_STR);
        $stmt->bindParam(':amount',            $amount,                PDO::PARAM_STR);
        $stmt->bindParam(':is_recurring',      $isRecurring,           PDO::PARAM_BOOL);
        $stmt->bindParam(':is_auto_calculated',$isAutoCalculated,     PDO::PARAM_BOOL);
        $stmt->bindParam(':pay_month',         $payMonth,              PDO::PARAM_STR);
        $stmt->bindParam(':pay_year',          $payYear,               PDO::PARAM_STR);
        $stmt->bindParam(':installment_no',    $installmentNo,         PDO::PARAM_INT);
        $stmt->bindParam(':total_installments',$totalInstallments,    PDO::PARAM_INT);
        $stmt->bindParam(':created_by',        $createdBy,             PDO::PARAM_STR);
        $stmt->execute();

        $newId = $stmt->fetchColumn();

        echo json_encode([
            'status' => 'success',
            'message' => 'Deduction added successfully',
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
