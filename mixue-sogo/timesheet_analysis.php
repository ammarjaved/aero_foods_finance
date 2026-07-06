<?php
// timesheet_analysis.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = "192.168.1.34";
$port = "5432";
$dbname = "mixue_sogo";
$user = "postgres";
$password = "Admin123";

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Base query with FULL JOIN to detect mismatches
    $sql = "
        SELECT
            COALESCE(e.employee_name, l.name) AS employee,
            COALESCE(e.month_date, l.month_date) AS date,
            e.proposed_start_time,
            l.start_time,
            e.proposed_end_time,
            l.end_time,
            e.total_hours AS proposed_total_hours,
            l.total_hr AS actual_total_hr,
            e.break_hour AS proposed_break_hr,        -- Added: proposed break from employee_timesheet
            l.break_time AS actual_break_hr,           -- Added: actual break from log_sheet
            CASE
                WHEN e.id IS NULL THEN 'Missing in employee_timesheet'
                WHEN l.id IS NULL THEN 'Missing in log_sheet'
                ELSE 'Matched'
            END AS status
        FROM public.employee_timesheet e
        FULL JOIN public.log_sheet l
            ON e.employee_name = l.name
            AND e.month_date = l.month_date
    ";

    $where = [];
    $params = [];

    // Filter: Specific employee (case-insensitive partial match)
    if (isset($_GET['employee']) && trim($_GET['employee']) !== '') {
        $where[] = "LOWER(COALESCE(e.employee_name, l.name)) ILIKE LOWER(:employee)";
        $params[':employee'] = '%' . trim($_GET['employee']) . '%';
    }

    // Filter: Specific date (YYYY-MM-DD)
    if (isset($_GET['date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['date'])) {
        $where[] = "COALESCE(e.month_date, l.month_date) = :date";
        $params[':date'] = $_GET['date'];
    }

    // Filter: Date range
    if (isset($_GET['from_date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from_date'])) {
        $where[] = "COALESCE(e.month_date, l.month_date) >= :from_date";
        $params[':from_date'] = $_GET['from_date'];
    }
    if (isset($_GET['to_date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to_date'])) {
        $where[] = "COALESCE(e.month_date, l.month_date) <= :to_date";
        $params[':to_date'] = $_GET['to_date'];
    }

    // Filter: Month and optional year
    if (isset($_GET['month']) && is_numeric($_GET['month']) && $_GET['month'] >= 1 && $_GET['month'] <= 12) {
        $where[] = "EXTRACT(MONTH FROM COALESCE(e.month_date, l.month_date)) = :month";
        $params[':month'] = (int)$_GET['month'];
        if (isset($_GET['year']) && is_numeric($_GET['year'])) {
            $where[] = "EXTRACT(YEAR FROM COALESCE(e.month_date, l.month_date)) = :year";
            $params[':year'] = (int)$_GET['year'];
        }
    }

    // Filter: Only show discrepancies
    if (isset($_GET['discrepancies']) && strtolower($_GET['discrepancies']) === 'true') {
        $where[] = "(e.proposed_start_time <> l.start_time
                     OR e.proposed_end_time <> l.end_time
                     OR e.total_hours <> l.total_hr
                     OR e.break_hour <> l.break_time
                     OR e.id IS NULL OR l.id IS NULL)";
    }

    // Build WHERE clause
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    // Order results
    $sql .= " ORDER BY employee ASC, date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Return JSON response
    echo json_encode([
        'status' => 'success',
        'message' => count($results) . ' record(s) found',
        'data' => $results
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>