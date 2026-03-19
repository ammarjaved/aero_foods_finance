<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host     = "192.168.1.34";
$port     = "5432";
$dbname   = "aero_foods_finance";
$user     = "postgres";
$password = "Admin123";

$month = isset($_GET['month']) ? trim($_GET['month']) : null;
$year  = isset($_GET['year'])  ? (int)trim($_GET['year'])  : (int)date('Y');

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $params = [];
    $where  = "WHERE 1=1";

    if ($month && $year) {
        $where .= " AND EXTRACT(MONTH FROM month_date) = :month AND EXTRACT(YEAR FROM month_date) = :year";
        $params[':month'] = (int)$month;
        $params[':year']  = $year;
    } elseif ($year) {
        $where .= " AND EXTRACT(YEAR FROM month_date) = :year";
        $params[':year'] = $year;
    }

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) AS total_expense FROM sds_expenditure $where");
    $stmt->execute($params);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'status'        => 'success',
        'total_expense' => (float)$row['total_expense'],
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage(), 'total_expense' => 0]);
}
?>
