<?php
// get_employee_timesheet.php - UPDATED WITH JOIN TO log_sheet (FIXED)
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
$dbname = "mixue_sogo";
$user = "postgres";
$password = "Admin123";

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Query with LEFT JOIN to log_sheet table (removed ORDER BY from here)
    $sql = "SELECT 
                a.id, 
                a.month_date, 
                a.employee_name, 
                a.proposed_start_time, 
                a.proposed_end_time,
                a.total_hours, 
                a.off_day, 
                a.created_by, 
                a.updated_by, 
                a.created_at, 
                a.updated_at,
                b.updated_at AS log_updated_at, 
                b.total_hr,
                break_hour
            FROM public.employee_timesheet a
            LEFT JOIN public.log_sheet b 
                ON a.month_date = b.month_date 
                AND a.employee_name = b.name";

    $conditions = [];
    $params = [];

    // General search across all text columns (updated with b.total_hr)
    if (isset($_GET['search']) && trim($_GET['search']) !== '') {
        $search = '%' . trim($_GET['search']) . '%';
        $conditions[] = "(COALESCE(a.id::text, '') ILIKE :search
            OR COALESCE(a.month_date::text, '') ILIKE :search
            OR COALESCE(a.employee_name, '') ILIKE :search
            OR COALESCE(a.proposed_start_time::text, '') ILIKE :search
            OR COALESCE(a.proposed_end_time::text, '') ILIKE :search
            OR COALESCE(a.total_hours::text, '') ILIKE :search
            OR COALESCE(a.off_day::text, '') ILIKE :search
            OR COALESCE(a.created_by, '') ILIKE :search
            OR COALESCE(a.updated_by, '') ILIKE :search
            OR COALESCE(b.total_hr::text, '') ILIKE :search)";
        $params[':search'] = $search;
    }

    // Month filter (all records in the specified month)
    if (isset($_GET['month_date']) && $_GET['month_date'] !== '') {
        $conditions[] = "a.month_date = :month_date";
        $params[':month_date'] = $_GET['month_date'];
    }

    // Employee name filter (case-insensitive partial match)
    if (isset($_GET['employee_name']) && $_GET['employee_name'] !== '') {
        $conditions[] = "a.employee_name ILIKE :employee_name";
        $params[':employee_name'] = '%' . $_GET['employee_name'] . '%';
    }

    // Filter by off_day status (?off_day=true / false / all)
    if (isset($_GET['off_day'])) {
        $off = strtolower(trim($_GET['off_day']));
        if ($off === 'true' || $off === '1') {
            $conditions[] = "a.off_day = TRUE";
        } elseif ($off === 'false' || $off === '0') {
            $conditions[] = "a.off_day = FALSE";
        }
        // if 'all' or invalid → no filter (show both)
    }

    // Filter only working days (off_day = false)
    if (isset($_GET['working_only']) && strtolower($_GET['working_only']) === 'true') {
        $conditions[] = "a.off_day = FALSE";
    }

    // Filter only off days
    if (isset($_GET['off_only']) && strtolower($_GET['off_only']) === 'true') {
        $conditions[] = "a.off_day = TRUE";
    }

    // Add WHERE clause if conditions exist
    if (!empty($conditions)) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }

    // Add ORDER BY at the end (only once)
    $sql .= " ORDER BY a.month_date DESC, a.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'message' => count($results) . ' record(s) found',
        'results' => $results
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