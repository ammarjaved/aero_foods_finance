<?php
// get_allowances.php - Fetch allowances for employees

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
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
$cafeKey = $_GET['db'] ?? 'mixue';
$dbname  = $dbMap[$cafeKey] ?? 'aero_foods_finance';

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // If employee_name is provided, filter by that employee
    if (isset($_GET['employee_name']) && !empty($_GET['employee_name'])) {
        $sql = "SELECT a.*, e.employment_type, e.basic_salary
                FROM employee_allowances a
                LEFT JOIN employees e ON LOWER(TRIM(e.short_name)) = LOWER(TRIM(a.employee_name))
                WHERE LOWER(TRIM(a.employee_name)) = LOWER(TRIM(:employee_name))
                ORDER BY a.allowance_type";
        $stmt = $conn->prepare($sql);
        $employeeName = $_GET['employee_name'];
        $stmt->bindParam(':employee_name', $employeeName, PDO::PARAM_STR);
        $stmt->execute();
    } else {
        // Fetch all allowances joined with employee info
        $sql = "SELECT a.*, e.employment_type, e.basic_salary
                FROM employee_allowances a
                LEFT JOIN employees e ON LOWER(TRIM(e.short_name)) = LOWER(TRIM(a.employee_name))
                ORDER BY a.employee_name, a.allowance_type";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
    }

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $count = count($results);

    echo json_encode([
        'status' => 'success',
        'message' => "$count allowance(s) found",
        'results' => $results
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
