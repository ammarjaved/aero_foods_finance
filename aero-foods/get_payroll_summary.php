<?php
// get_payroll_summary.php - Fetch all active employees with their allowances and deductions

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

// Month filter (optional - used to filter one-off deductions by month)
$payMonth = isset($_GET['month']) ? $_GET['month'] : null;
$payYear  = isset($_GET['year']) ? $_GET['year'] : null;

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch all active employees
    $empSql = "SELECT short_name, employment_type, basic_salary
               FROM employees
               WHERE is_active = 'yes'
               ORDER BY short_name";
    $empStmt = $conn->prepare($empSql);
    $empStmt->execute();
    $employees = $empStmt->fetchAll(PDO::FETCH_ASSOC);

    // Compute overtime + public-holiday premium from log_sheet for the requested month.
    // Rules mirror salary_summary.php:
    //   - hours beyond 8 in a day are OT at RM8/hr flat (same on public holidays)
    //   - monthly employees: days beyond 26 are paid entirely at RM8/hr (all OT, no PH check)
    //   - PH premium (extra pay above a normal day, first 8 hrs):
    //       monthly <=26 days: base is doubled -> premium = dailyRate*(hrs/8) capped at dailyRate
    //       hourly: RM16/hr instead of RM8 -> premium = min(hrs,8) * 8
    $otMap = []; // normalized name => ['pay', 'hours', 'details', 'ph_pay', 'ph_details']
    if ($payMonth && $payYear) {
        try {
            $typeMap  = [];
            $basicMap = [];
            foreach ($employees as $e) {
                $k = strtolower(preg_replace('/\s+/', ' ', trim($e['short_name'])));
                $typeMap[$k]  = strtolower(trim($e['employment_type']));
                $basicMap[$k] = floatval($e['basic_salary']);
            }

            // Public holidays live in the main DB (same as salary_summary.php)
            $publicHolidays = []; // 'YYYY-MM-DD' => holiday_name
            $otMonthStart = sprintf('%04d-%02d-01', $payYear, $payMonth);
            $otMonthEnd   = sprintf('%04d-%02d-%02d', $payYear, $payMonth,
                              date('t', mktime(0, 0, 0, $payMonth, 1, $payYear)));
            try {
                $mainConn = new PDO("pgsql:host=$host;port=$port;dbname=aero_foods_finance", $user, $password);
                $mainConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $phStmt = $mainConn->prepare(
                    "SELECT date_start::text AS date_start,
                            date_end::text   AS date_end,
                            holiday_name
                     FROM public.public_holidays
                     WHERE date_start <= :max_date
                       AND date_end   >= :min_date"
                );
                $phStmt->execute([':min_date' => $otMonthStart, ':max_date' => $otMonthEnd]);
                foreach ($phStmt->fetchAll(PDO::FETCH_ASSOC) as $ph) {
                    $cur = strtotime(substr($ph['date_start'], 0, 10));
                    $end = strtotime(substr($ph['date_end'],   0, 10));
                    while ($cur <= $end) {
                        $publicHolidays[date('Y-m-d', $cur)] = $ph['holiday_name'];
                        $cur = strtotime('+1 day', $cur);
                    }
                }
                $mainConn = null;
            } catch (Exception $e) {
                $publicHolidays = [];
            }

            $logSql = "SELECT name, month_date, total_hr
                       FROM public.log_sheet
                       WHERE EXTRACT(MONTH FROM month_date) = :pay_month
                         AND EXTRACT(YEAR FROM month_date) = :pay_year
                       ORDER BY name, month_date";
            $logStmt = $conn->prepare($logSql);
            $logStmt->bindParam(':pay_month', $payMonth);
            $logStmt->bindParam(':pay_year', $payYear);
            $logStmt->execute();
            $logRows = $logStmt->fetchAll(PDO::FETCH_ASSOC);

            $grouped = [];
            foreach ($logRows as $r) {
                $k = strtolower(preg_replace('/\s+/', ' ', trim($r['name'])));
                $grouped[$k][] = $r;
            }

            foreach ($grouped as $k => $rows) {
                $empType   = isset($typeMap[$k]) ? $typeMap[$k] : 'hourly';
                $basic     = isset($basicMap[$k]) ? $basicMap[$k] : 0;
                $dayCount  = 0;
                $otPay     = 0;
                $otHours   = 0;
                $otDetails = [];
                $phPay     = 0;
                $phDetails = [];
                $basePay   = 0; // hourly staff: regular worked pay (first 8 hrs/day @ RM8)
                foreach ($rows as $r) {
                    $hrs        = floatval($r['total_hr']);
                    $date       = date('Y-m-d', strtotime($r['month_date']));
                    $isPH       = isset($publicHolidays[$date]);
                    $isExtraDay = false;
                    $dayPhPay   = 0;
                    if ($empType === 'monthly') {
                        $dayCount++;
                        if ($dayCount <= 26) {
                            $dayOtHours = max(0, $hrs - 8);
                            if ($isPH) {
                                // base pay is doubled on a PH -> premium equals the normal base
                                $dailyRate = $basic / 26;
                                $dayPhPay  = ($hrs <= 8) ? $dailyRate * ($hrs / 8) : $dailyRate;
                            }
                        } else {
                            // extra day beyond 26: flat RM8/hr, no PH premium (as in salary_summary)
                            $isExtraDay = true;
                            $dayOtHours = $hrs;
                        }
                    } else {
                        $dayOtHours = max(0, $hrs - 8);
                        // regular worked pay: first 8 hrs/day at RM8 flat
                        // (this is what the day-by-day salary_summary.php counts;
                        //  hourly staff have no fixed basic, so it lives here)
                        $basePay += min($hrs, 8) * 8;
                        if ($isPH) {
                            // RM16/hr instead of RM8 for the first 8 hrs
                            $dayPhPay = min($hrs, 8) * 8;
                        }
                    }
                    // Overtime counts only when it reaches a full hour; anything
                    // under 1 hour is ignored (not paid or counted as overtime).
                    if ($dayOtHours < 1) {
                        $dayOtHours = 0;
                    }
                    $dayOtPay = $dayOtHours * 8;
                    $otHours += $dayOtHours;
                    $otPay   += $dayOtPay;
                    $phPay   += $dayPhPay;

                    if ($dayOtPay > 0) {
                        $otDetails[] = [
                            'date'         => $date,
                            'hours_worked' => $hrs,
                            'ot_hours'     => round($dayOtHours, 2),
                            'ot_pay'       => round($dayOtPay, 2),
                            'is_extra_day' => $isExtraDay,
                        ];
                    }
                    if ($dayPhPay > 0) {
                        $phDetails[] = [
                            'date'         => $date,
                            'holiday_name' => $publicHolidays[$date],
                            'hours_worked' => $hrs,
                            'premium'      => round($dayPhPay, 2),
                        ];
                    }
                }
                $otMap[$k] = [
                    'pay'        => $otPay,
                    'hours'      => $otHours,
                    'details'    => $otDetails,
                    'ph_pay'     => $phPay,
                    'ph_details' => $phDetails,
                    'base_pay'   => $basePay,
                ];
            }
        } catch (Exception $e) {
            // log_sheet unavailable in this DB - report zero overtime
            $otMap = [];
        }
    }

    // One-time deductions store pay_month as a 3-letter abbreviation (e.g. "JUN"),
    // matching the MONTHS list in the payroll form. $payMonth arrives here as a
    // number, so build every accepted representation (abbrev / plain / padded)
    // to match regardless of how the row was saved.
    $monthAbbrevs   = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                           'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    $payMonthNum    = intval($payMonth);
    $payMonthAbbr   = ($payMonthNum >= 1 && $payMonthNum <= 12) ? $monthAbbrevs[$payMonthNum] : '';
    $payMonthPlain  = (string) $payMonthNum;
    $payMonthPadded = sprintf('%02d', $payMonthNum);

    $summary = [];

    foreach ($employees as $emp) {
        $empName = $emp['short_name'];

        // Fetch active allowances for this employee.
        // When a month/year is given, only include allowances whose effective
        // range overlaps with that calendar month:
        //   effective_from <= last day of pay month
        //   (effective_to IS NULL OR effective_to >= first day of pay month)
        if ($payMonth && $payYear) {
            $monthStart = sprintf('%04d-%02d-01', $payYear, $payMonth);
            $monthEnd   = sprintf('%04d-%02d-%02d', $payYear, $payMonth,
                            date('t', mktime(0, 0, 0, $payMonth, 1, $payYear)));

            $allowSql = "SELECT id, allowance_type, amount, is_recurring, effective_from, effective_to
                         FROM employee_allowances
                         WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                           AND (effective_from IS NULL OR effective_from <= :month_end)
                           AND (effective_to IS NULL OR effective_to >= :month_start)
                         ORDER BY allowance_type";
            $allowStmt = $conn->prepare($allowSql);
            $allowStmt->bindParam(':employee_name', $empName, PDO::PARAM_STR);
            $allowStmt->bindParam(':month_end',     $monthEnd,  PDO::PARAM_STR);
            $allowStmt->bindParam(':month_start',   $monthStart, PDO::PARAM_STR);
        } else {
            $allowSql = "SELECT id, allowance_type, amount, is_recurring, effective_from, effective_to
                         FROM employee_allowances
                         WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                           AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                         ORDER BY allowance_type";
            $allowStmt = $conn->prepare($allowSql);
            $allowStmt->bindParam(':employee_name', $empName, PDO::PARAM_STR);
        }
        $allowStmt->execute();
        $allowances = $allowStmt->fetchAll(PDO::FETCH_ASSOC);

        $totalAllowances = 0;
        foreach ($allowances as $a) {
            $totalAllowances += floatval($a['amount']);
        }

        // Fetch applicable deductions for this employee
        // Recurring deductions always apply; one-offs apply only if pay_month/pay_year match
        if ($payMonth && $payYear) {
            $deductSql = "SELECT id, deduction_type, amount, is_recurring, is_auto_calculated,
                                 pay_month, pay_year, installment_no, total_installments
                          FROM employee_deductions
                          WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                            AND (
                                is_recurring = TRUE
                                OR (
                                    UPPER(TRIM(pay_month)) IN (:pay_month_abbr, :pay_month_plain, :pay_month_padded)
                                    AND TRIM(pay_year::text) = TRIM(:pay_year)
                                )
                            )
                          ORDER BY deduction_type";
            $deductStmt = $conn->prepare($deductSql);
            $deductStmt->bindParam(':employee_name',   $empName,        PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_month_abbr',  $payMonthAbbr,   PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_month_plain', $payMonthPlain,  PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_month_padded',$payMonthPadded, PDO::PARAM_STR);
            $deductStmt->bindParam(':pay_year',        $payYear,        PDO::PARAM_STR);
        } else {
            $deductSql = "SELECT id, deduction_type, amount, is_recurring, is_auto_calculated,
                                 pay_month, pay_year, installment_no, total_installments
                          FROM employee_deductions
                          WHERE LOWER(TRIM(employee_name)) = LOWER(TRIM(:employee_name))
                            AND is_recurring = TRUE
                          ORDER BY deduction_type";
            $deductStmt = $conn->prepare($deductSql);
            $deductStmt->bindParam(':employee_name', $empName, PDO::PARAM_STR);
        }
        $deductStmt->execute();
        $deductions = $deductStmt->fetchAll(PDO::FETCH_ASSOC);

        $totalDeductions = 0;
        foreach ($deductions as $d) {
            $totalDeductions += floatval($d['amount']);
        }

        $empNorm = strtolower(preg_replace('/\s+/', ' ', trim($empName)));
        $ot      = isset($otMap[$empNorm])
                     ? $otMap[$empNorm]
                     : ['pay' => 0, 'hours' => 0, 'details' => [],
                        'ph_pay' => 0, 'ph_details' => [], 'base_pay' => 0];

        // Monthly staff keep their fixed stored basic. Hourly staff have no
        // stored basic, so their basic is the regular worked pay computed above
        // (first 8 hrs/day at RM8), making the Monthly Salary take-home match
        // the day-by-day salary summary instead of showing zero.
        $empTypeNorm = strtolower(trim($emp['employment_type']));
        $basicOut    = ($empTypeNorm === 'monthly')
                         ? floatval($emp['basic_salary'])
                         : round($ot['base_pay'], 2);

        $summary[] = [
            'employee_name'    => $empName,
            'employment_type'  => $emp['employment_type'],
            'basic_salary'     => $basicOut,
            'overtime_hours'   => round($ot['hours'], 2),
            'overtime_pay'     => round($ot['pay'], 2),
            'overtime_details' => $ot['details'],
            'ph_premium'       => round($ot['ph_pay'], 2),
            'ph_details'       => $ot['ph_details'],
            'allowances'       => $allowances,
            'total_allowances' => round($totalAllowances, 2),
            'deductions'       => $deductions,
            'total_deductions' => round($totalDeductions, 2),
        ];
    }

    echo json_encode([
        'status'  => 'success',
        'message' => count($summary) . ' employee(s) found',
        'results' => $summary
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
