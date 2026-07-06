<?php
// get_employee_timesheet.php - WITH START_DATE & END_DATE FILTER ON month_date
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "192.168.1.34";
$port = "5432";
$dbname = "mixue_sogo";  // Change if needed for multi-company later
$user = "postgres";
$password = "Admin123";

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "SELECT id, month_date, employee_name, proposed_start_time, proposed_end_time,
                   break_hour, total_hours, off_day, created_by, updated_by, created_at, updated_at
            FROM public.employee_timesheet";

    $conditions = [];
    $params = [];

    // 1. Global search
    if (isset($_GET['search']) && trim($_GET['search']) !== '') {
        $search = '%' . trim($_GET['search']) . '%';
        $conditions[] = "(COALESCE(id::text, '') ILIKE :search
            OR COALESCE(month_date::text, '') ILIKE :search
            OR COALESCE(employee_name, '') ILIKE :search
            OR COALESCE(proposed_start_time::text, '') ILIKE :search
            OR COALESCE(proposed_end_time::text, '') ILIKE :search
            OR COALESCE(total_hours::text, '') ILIKE :search
            OR COALESCE(off_day::text, '') ILIKE :search
            OR COALESCE(created_by, '') ILIKE :search
            OR COALESCE(updated_by, '') ILIKE :search)";
        $params[':search'] = $search;
    }

    // 2. Date range filter using month_date (NEW MAIN FEATURE)
    if (isset($_GET['start_date']) && $_GET['start_date'] !== '') {
        $conditions[] = "month_date >= :start_date";
        $params[':start_date'] = $_GET['start_date'];
    }

    if (isset($_GET['end_date']) && $_GET['end_date'] !== '') {
        $conditions[] = "month_date <= :end_date";
        $params[':end_date'] = $_GET['end_date'];
    }

    // Backward compatibility: single month_date filter
    if (isset($_GET['month_date']) && $_GET['month_date'] !== '') {
        $conditions[] = "month_date = :month_date";
        $params[':month_date'] = $_GET['month_date'];
    }

    // 3. Employee name filter (partial match)
    if (isset($_GET['employee_name']) && $_GET['employee_name'] !== '') {
        $conditions[] = "employee_name ILIKE :employee_name";
        $params[':employee_name'] = '%' . $_GET['employee_name'] . '%';
    }

    // 4. Off day filters
    if (isset($_GET['off_day'])) {
        $off = strtolower(trim($_GET['off_day']));
        if ($off === 'true' || $off === '1') {
            $conditions[] = "off_day = TRUE";
        } elseif ($off === 'false' || $off === '0') {
            $conditions[] = "off_day = FALSE";
        }
    }

    if (isset($_GET['working_only']) && strtolower($_GET['working_only']) === 'true') {
        $conditions[] = "off_day = FALSE";
    }

    if (isset($_GET['off_only']) && strtolower($_GET['off_only']) === 'true') {
        $conditions[] = "off_day = TRUE";
    }

    // Build WHERE clause
    if (!empty($conditions)) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }

    $sql .= " ORDER BY month_date DESC, employee_name ASC, id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status'  => 'success',
        'message' => count($results) . ' record(s) found',
        'results' => $results,
        'filters' => [
            'start_date'     => $_GET['start_date'] ?? null,
            'end_date'       => $_GET['end_date'] ?? null,
            'employee_name'  => $_GET['employee_name'] ?? null,
            'search'         => $_GET['search'] ?? null,
            'off_day'        => $_GET['off_day'] ?? null
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage()
    ]);
}
?>