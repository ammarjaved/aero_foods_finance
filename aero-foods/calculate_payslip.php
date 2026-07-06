<?php
// calculate_payslip.php - Compute net pay for an employee for a month and save to payslips table
//
// Frontend flow:
//   1. Call salary_summary.php to get total basic_pay + overtime for the month
//   2. Send those totals + employee_name + month + year + db to this endpoint
//   3. This endpoint fetches active allowances + applicable deductions,
//      computes net pay, and saves/updates the payslips table

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

    // Validate required fields
    if (empty($input['employee_name'])) {
        throw new Exception("Missing required field: employee_name");
    }
    if (empty($input['pay_month'])) {
        throw new Exception("Missing required field: pay_month");
    }
    if (empty($input['pay_year'])) {
        throw new Exception("Missing required field: pay_year");
    }

    $cafeKey     = isset($input['db']) ? $input['db'] : 'mixue';
    $dbname      = $dbMap[$cafeKey] ?? 'aero_foods_finance';
    $employeeName = trim($input['employee_name']);
    $payMonth     = trim($input['pay_month']);
    $payYear      = trim($input['pay_year']);
    $basicPay     = isset($input['basic_pay']) ? floatval($input['basic_pay']) : 0;
    $overtimePay  = isset($input['overtime_pay']) ? floatval($input['overtime_pay']) : 0;
    $createdBy    = isset($input['created_by']) ? $input['created_by'] : null;

    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Fetch active allowances for this employee
    $allowSql = "SELECT allowance_type, amount
                 FROM employee_allowances
                 WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                   AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                 ORDER BY allowance_type";
    $allowStmt = $conn->prepare($allowSql);
    $allowStmt->bindParam(':employee_name', $employeeName, PDO::PARAM_STR);
    $allowStmt->execute();
    $allowances = $allowStmt->fetchAll(PDO::FETCH_ASSOC);

    $totalAllowances = 0;
    $allowanceBreakdown = [];
    foreach ($allowances as $a) {
        $amt = floatval($a['amount']);
        $totalAllowances += $amt;
        $allowanceBreakdown[] = [
            'type'   => $a['allowance_type'],
            'amount' => $amt
        ];
    }

    // 2. Fetch applicable deductions
    //    Recurring always apply; one-offs only if pay_month/pay_year match
    $deductSql = "SELECT deduction_type, amount, is_recurring, installment_no, total_installments
                  FROM employee_deductions
                  WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                    AND (
                        is_recurring = TRUE
                        OR (pay_month = :pay_month AND pay_year = :pay_year)
                    )
                  ORDER BY deduction_type";
    $deductStmt = $conn->prepare($deductSql);
    $deductStmt->bindParam(':employee_name', $employeeName, PDO::PARAM_STR);
    $deductStmt->bindParam(':pay_month', $payMonth, PDO::PARAM_STR);
    $deductStmt->bindParam(':pay_year', $payYear, PDO::PARAM_STR);
    $deductStmt->execute();
    $deductions = $deductStmt->fetchAll(PDO::FETCH_ASSOC);

    $totalDeductions = 0;
    $deductionBreakdown = [];
    foreach ($deductions as $d) {
        $amt = floatval($d['amount']);
        $totalDeductions += $amt;
        $deductionBreakdown[] = [
            'type'              => $d['deduction_type'],
            'amount'            => $amt,
            'is_recurring'      => $d['is_recurring'] === 't' || $d['is_recurring'] === true,
            'installment_no'    => intval($d['installment_no']),
            'total_installments'=> intval($d['total_installments'])
        ];
    }

    // 3. Compute net pay
    $netPay = ($basicPay + $overtimePay + $totalAllowances) - $totalDeductions;

    // 4. Save to payslips table (insert or update if exists)
    $checkSql = "SELECT id FROM payslips
                 WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                   AND pay_month = :pay_month
                   AND pay_year = :pay_year";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bindParam(':employee_name', $employeeName, PDO::PARAM_STR);
    $checkStmt->bindParam(':pay_month', $payMonth, PDO::PARAM_STR);
    $checkStmt->bindParam(':pay_year', $payYear, PDO::PARAM_STR);
    $checkStmt->execute();
    $existingId = $checkStmt->fetchColumn();

    if ($existingId) {
        $updateSql = "UPDATE payslips
                      SET basic_pay        = :basic_pay,
                          overtime_pay     = :overtime_pay,
                          total_allowances = :total_allowances,
                          total_deductions = :total_deductions,
                          net_pay          = :net_pay,
                          status           = 'draft',
                          updated_by       = :updated_by,
                          updated_at       = CURRENT_TIMESTAMP
                      WHERE id = :id";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bindParam(':id',               $existingId,       PDO::PARAM_INT);
        $updateStmt->bindParam(':basic_pay',        $basicPay,         PDO::PARAM_STR);
        $updateStmt->bindParam(':overtime_pay',     $overtimePay,      PDO::PARAM_STR);
        $updateStmt->bindParam(':total_allowances', $totalAllowances,  PDO::PARAM_STR);
        $updateStmt->bindParam(':total_deductions', $totalDeductions,  PDO::PARAM_STR);
        $updateStmt->bindParam(':net_pay',          $netPay,           PDO::PARAM_STR);
        $updateStmt->bindParam(':updated_by',       $createdBy,        PDO::PARAM_STR);
        $updateStmt->execute();

        $payslipId = $existingId;
        $action = 'updated';
    } else {
        $insertSql = "INSERT INTO payslips
                          (employee_name, pay_month, pay_year, basic_pay, overtime_pay,
                           total_allowances, total_deductions, net_pay, status, created_by)
                      VALUES
                          (:employee_name, :pay_month, :pay_year, :basic_pay, :overtime_pay,
                           :total_allowances, :total_deductions, :net_pay, 'draft', :created_by)
                      RETURNING id";
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->bindParam(':employee_name',     $employeeName,     PDO::PARAM_STR);
        $insertStmt->bindParam(':pay_month',         $payMonth,         PDO::PARAM_STR);
        $insertStmt->bindParam(':pay_year',          $payYear,          PDO::PARAM_STR);
        $insertStmt->bindParam(':basic_pay',         $basicPay,         PDO::PARAM_STR);
        $insertStmt->bindParam(':overtime_pay',      $overtimePay,      PDO::PARAM_STR);
        $insertStmt->bindParam(':total_allowances',  $totalAllowances,  PDO::PARAM_STR);
        $insertStmt->bindParam(':total_deductions',  $totalDeductions,  PDO::PARAM_STR);
        $insertStmt->bindParam(':net_pay',           $netPay,           PDO::PARAM_STR);
        $insertStmt->bindParam(':created_by',        $createdBy,        PDO::PARAM_STR);
        $insertStmt->execute();

        $payslipId = $insertStmt->fetchColumn();
        $action = 'inserted';
    }

    echo json_encode([
        'status'  => 'success',
        'message' => "Payslip $action successfully",
        'action'  => $action,
        'data'    => [
            'id'               => $payslipId,
            'employee_name'    => $employeeName,
            'pay_month'        => $payMonth,
            'pay_year'         => $payYear,
            'basic_pay'        => round($basicPay, 2),
            'overtime_pay'     => round($overtimePay, 2),
            'allowances'       => $allowanceBreakdown,
            'total_allowances' => round($totalAllowances, 2),
            'deductions'       => $deductionBreakdown,
            'total_deductions' => round($totalDeductions, 2),
            'net_pay'          => round($netPay, 2)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}

$conn = null;
?>
