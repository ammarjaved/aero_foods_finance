<?php
// timesheet_analysis_mobile.php - Grouped by Date (Active Employees + Year/Month Filters)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database config
$host = "192.168.1.34";
$port = "5432";
$dbname = "mixue_sogo";
$user = "postgres";
$password = "Admin123";

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch active employees
    $activeStmt = $pdo->prepare("SELECT short_name FROM employees WHERE is_active = 'yes' AND short_name IS NOT NULL AND TRIM(short_name) <> ''");
    $activeStmt->execute();
    $activeEmployees = $activeStmt->fetchAll(PDO::FETCH_COLUMN, 0);

    if (empty($activeEmployees)) {
        echo json_encode([
            'status' => 'success',
            'filters' => [
                'year' => null,
                'month' => null
            ],
            'total_dates' => 0,
            'total_employee_entries' => 0,
            'dates' => [],
            'data' => []
        ], JSON_PRETTY_PRINT);
        exit();
    }

    // Dynamic IN placeholders
    $placeholders = implode(',', array_fill(0, count($activeEmployees), '?'));

    // Get and validate filters
    $yearFilter = $_GET['year'] ?? null;
    $monthFilter = $_GET['month'] ?? null;

    $validYear = null;
    $validMonth = null;

    if ($yearFilter !== null && preg_match('/^\d{4}$/', $yearFilter) && $yearFilter >= 2000 && $yearFilter <= 2100) {
        $validYear = (int)$yearFilter;
    }

    if ($monthFilter !== null && preg_match('/^(1[0-2]|[1-9])$/', $monthFilter)) {
        $validMonth = (int)$monthFilter;
    }

    // Build base query
    $sql = "
        SELECT
            month_date::text AS date,
            TRIM(name) AS employee_name,
            SUM(total_hr) AS total_hours
        FROM public.log_sheet
        WHERE COALESCE(is_break, 'no') = 'no'
          AND name IS NOT NULL
          AND TRIM(name) <> ''
          AND TRIM(name) IN ($placeholders)
          AND month_date IS NOT NULL
    ";

    $params = $activeEmployees; // First params are for IN clause

    // Add year filter if provided
    if ($validYear !== null) {
        $sql .= " AND EXTRACT(YEAR FROM month_date) = ?";
        $params[] = $validYear;
    }

    // Add month filter if provided
    if ($validMonth !== null) {
        $sql .= " AND EXTRACT(MONTH FROM month_date) = ?";
        $params[] = $validMonth;
    }

    $sql .= "
        GROUP BY month_date, TRIM(name)
        ORDER BY month_date DESC, total_hours DESC, employee_name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Build nested structure: date → employees
    $grouped = [];
    $dates = [];
    $totalEmployeesLogged = 0;

    foreach ($rows as $row) {
        $date = $row['date'];
        $hours = round((float)$row['total_hours'], 2);

        if (!isset($grouped[$date])) {
            $grouped[$date] = [];
            $dates[] = $date;
        }

        $grouped[$date][] = [
            'employee_name' => $row['employee_name'],
            'total_hours' => $hours
        ];

        $totalEmployeesLogged++;
    }

    // Sort dates descending
    rsort($dates);

    echo json_encode([
        'status' => 'success',
        'filters' => [
            'year' => $validYear,
            'month' => $validMonth
        ],
        'total_dates' => count($dates),
        'total_employee_entries' => $totalEmployeesLogged,
        'dates' => $dates,
        'data' => $grouped
    ], JSON_PRETTY_PRINT);

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