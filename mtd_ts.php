<?php
// Enable CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    exit(0);
}

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

$host = "localhost";
$db = "aero_foods_finance";
$user = "postgres";
$password = "123";

$dsn = "pgsql:host=$host;dbname=$db";

try {
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => "Connection failed: " . $e->getMessage()]));
}

// get_targets.php - Fetch targets data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Get month and year from request parameters
        $month = isset($_GET['month']) ? intval($_GET['month']) : date('n'); // Current month if not specified
        $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y'); // Current year if not specified
        $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d'); // Current date if not specified

        // Query to fetch actual sales data
        $sql = "SELECT SUM(total_sales) as mtd FROM daily_sheet WHERE month = :month AND year = :year AND month_date <= :date";
        $salesStmt = $pdo->prepare($sql);
        $salesStmt->bindParam(':month', $month, PDO::PARAM_INT);
        $salesStmt->bindParam(':year', $year, PDO::PARAM_INT);
        $salesStmt->bindParam(':date', $date, PDO::PARAM_STR);
        $salesStmt->execute();
        $salesData = $salesStmt->fetch(PDO::FETCH_ASSOC);

        // Query to fetch total labor hours
        $laborSql = "SELECT SUM(total_hr) as total_hr 
             FROM log_sheet
             WHERE EXTRACT(MONTH FROM start_time) = :month
             AND EXTRACT(YEAR FROM start_time) = :year 
             AND month_date = :date";

            $laborStmt = $pdo->prepare($laborSql);
            $laborStmt->bindParam(':month', $month, PDO::PARAM_INT);
            $laborStmt->bindParam(':year', $year, PDO::PARAM_INT);
            $laborStmt->bindParam(':date', $date, PDO::PARAM_STR); // Fixed: changed $salesStmt to $laborStmt
            $laborStmt->execute();
            $lh = $laborStmt->fetch(PDO::FETCH_ASSOC);

        // Query to fetch previous day balance
        $prevDaySql = "SELECT next_day_balance 
                        FROM daily_sheet 
                        WHERE month = :month 
                        AND year = :year 
                        AND month_date = (:date::date - INTERVAL '1 day')
                        ORDER BY month_date DESC
                        LIMIT 1";
        $prevDayStmt = $pdo->prepare($prevDaySql);
        $prevDayStmt->bindParam(':month', $month, PDO::PARAM_INT);
        $prevDayStmt->bindParam(':year', $year, PDO::PARAM_INT);
        $prevDayStmt->bindParam(':date', $date, PDO::PARAM_STR);
        $prevDayStmt->execute();
        $pre = $prevDayStmt->fetch(PDO::FETCH_ASSOC);
        
        // Safely handle the previous day balance value
        $pre_balance = ($pre && isset($pre['next_day_balance'])) ? $pre['next_day_balance'] : null;
        
        // Prepare response with all data
        $response = [
            'mtd' => $salesData['mtd'] ?? '0',
            'tlh' => $lh['total_hr'] ?? '0',
            'pre' => $pre_balance
        ];
        
        echo json_encode(['data' => $response]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
?>