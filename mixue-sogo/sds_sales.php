<?php
// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// Database config
$host = "192.168.1.34";
$port = "5432";
$user = "postgres";
$password = "Admin123";
$databases = [
    'mixue_sogo' => true,
    'aero_foods_finance' => true,
    'abe_yus_finance' => true,
    'amazon_cafe_finance' => true,
    'amazon_cafe_finance_lyp' => true,
    'ojim_finance' => true,
];
try {
    $month = isset($_GET['month']) ? intval($_GET['month']) : null;
    $year = isset($_GET['year']) ? intval($_GET['year']) : (int)date('Y');
    $company_input = isset($_GET['company']) ? trim($_GET['company']) : null;
    $companies_input = $company_input ? array_filter(array_map('trim', explode(',', $company_input))) : [];
    if ($month === null || $month < 1 || $month > 12) {
        throw new Exception('Invalid or missing month parameter.');
    }
    $results = [];
    $grand_totals = ['sales' => 0.0, 'bank' => 0.0, 'hours' => 0.0, 'cash_box' => 0.0, 'expenses' => 0.0];
    $companies = $companies_input ? $companies_input : array_keys($databases);
    $num_days = cal_days_in_month(CAL_GREGORIAN, $month, $year);
    $start_date = sprintf("%04d-%02d-01", $year, $month);
    $end_date = sprintf("%04d-%02d-%02d", $year, $month, $num_days);
    foreach ($companies as $dbname) {
        if (!array_key_exists($dbname, $databases)) {
            $results[$dbname] = ['error' => true, 'message' => 'Invalid company name.'];
            continue;
        }
        try {
            $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Initialize daily array
            $daily = [];
            for ($d = 1; $d <= $num_days; $d++) {
                $date = sprintf("%04d-%02d-%02d", $year, $month, $d);
                $daily[$date] = ['sales' => 0.0, 'bank' => 0.0, 'hours' => 0.0, 'cash_box' => 0.0, 'expenses' => 0.0];
            }
            $monthly = ['sales' => 0.0, 'bank' => 0.0, 'hours' => 0.0, 'cash_box' => 0.0, 'expenses' => 0.0];
            // 1. Sales + Cash Box from daily_sheet
            $sql_daily = "SELECT month_date, total_sales, cash_box_amount
                          FROM public.daily_sheet
                          WHERE month_date >= :start AND month_date <= :end";
            $stmt = $pdo->prepare($sql_daily);
            $stmt->execute([':start' => $start_date, ':end' => $end_date]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $date = $row['month_date'];
                if (isset($daily[$date])) {
                    $daily[$date]['sales'] += (float)$row['total_sales'];
                    $daily[$date]['cash_box'] += (float)$row['cash_box_amount'];
                    $monthly['sales'] += (float)$row['total_sales'];
                    $monthly['cash_box'] += (float)$row['cash_box_amount'];
                }
            }
            // 2. Bank from bank_reconciliation_sheet
            $sql_bank = "SELECT month_date, actual_total
                         FROM public.bank_reconciliation_sheet
                         WHERE month_date >= :start AND month_date <= :end";
            $stmt = $pdo->prepare($sql_bank);
            $stmt->execute([':start' => $start_date, ':end' => $end_date]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $date = $row['month_date'];
                if (isset($daily[$date])) {
                    $daily[$date]['bank'] += (float)$row['actual_total'];
                    $monthly['bank'] += (float)$row['actual_total'];
                }
            }
            // 3. Labour hours from log_sheet
            $sql_hours = "SELECT month_date, total_hr
                          FROM public.log_sheet
                          WHERE month_date >= :start AND month_date <= :end";
            $stmt = $pdo->prepare($sql_hours);
            $stmt->execute([':start' => $start_date, ':end' => $end_date]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $date = $row['month_date'];
                if (isset($daily[$date])) {
                    $daily[$date]['hours'] += (float)$row['total_hr'];
                    $monthly['hours'] += (float)$row['total_hr'];
                }
            }
            // 4. Expenses from daily_expenditure – no is_approved filter for other DBs
            $sql_exp = "SELECT month_date, SUM(amount) AS total_exp
                        FROM public.daily_expenditure
                        WHERE month_date >= :start AND month_date <= :end
                        GROUP BY month_date";
            $stmt = $pdo->prepare($sql_exp);
            $stmt->execute([':start' => $start_date, ':end' => $end_date]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $date = $row['month_date'];
                if (isset($daily[$date])) {
                    $daily[$date]['expenses'] += (float)$row['total_exp'];
                    $monthly['expenses'] += (float)$row['total_exp'];
                }
            }
            // 5. Additional expenses from sds_expenditure (only mixue_sogo + with is_approved)
            if ($dbname === 'aero_foods_finance') {
                $sql_sds = "SELECT month_date, SUM(amount) AS total_exp
                            FROM public.sds_expenditure
                            WHERE month_date >= :start AND month_date <= :end AND is_approved = true
                            GROUP BY month_date";
                $stmt = $pdo->prepare($sql_sds);
                $stmt->execute([':start' => $start_date, ':end' => $end_date]);
                foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    $date = $row['month_date'];
                    if (isset($daily[$date])) {
                        $daily[$date]['expenses'] += (float)$row['total_exp'];
                        $monthly['expenses'] += (float)$row['total_exp'];
                    }
                }
            }
            $results[$dbname] = [
                'daily_data' => $daily,
                'monthly_totals' => $monthly
            ];
            // Accumulate grand totals
            $grand_totals['sales'] += $monthly['sales'];
            $grand_totals['bank'] += $monthly['bank'];
            $grand_totals['hours'] += $monthly['hours'];
            $grand_totals['cash_box'] += $monthly['cash_box'];
            $grand_totals['expenses'] += $monthly['expenses'];
        } catch (PDOException $e) {
            error_log("DB Error [$dbname]: " . $e->getMessage());
            $results[$dbname] = ['error' => true, 'message' => 'Query failed: ' . $e->getMessage()];
        }
    }
    echo json_encode([
        'status' => 'success',
        'results' => $results,
        'all_totals' => $grand_totals,
        'filters' => [
            'month' => $month,
            'year' => $year,
            'company' => $company_input
        ]
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>